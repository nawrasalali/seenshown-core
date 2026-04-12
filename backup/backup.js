#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════
   SEENSHOWN — DAILY BACKUP SYSTEM
   Enterprise-grade: daily Supabase → GitHub backup
   
   Run: node backup/backup.js
   Cron: Daily 3am AEST via GitHub Actions
═══════════════════════════════════════════════════════ */

const https=require('https');
const fs=require('fs');
const path=require('path');

const SB_URL='vfcbdeawypooqcevuzac.supabase.co';
const SB_SERVICE_KEY=process.env.SUPABASE_SERVICE_KEY||'';
const GITHUB_TOKEN=process.env.BACKUP_GITHUB_TOKEN||process.env.GITHUB_TOKEN||'';
const BACKUP_REPO='nawrasalali/seenshown-backup';
const TABLES=['profiles','simulations','investor_registrations','referral_partners','live_rooms','point_transactions'];

function httpsCall(method,hostname,p,headers,body){
  return new Promise(function(resolve,reject){
    var data='';
    var bodyStr=body?JSON.stringify(body):'';
    var opts={method,hostname,path:p,headers:{...headers}};
    if(bodyStr)opts.headers['Content-Length']=Buffer.byteLength(bodyStr);
    var req=https.request(opts,function(res){res.on('data',function(d){data+=d;});res.on('end',function(){try{resolve(JSON.parse(data));}catch(e){resolve({_raw:data});}});});
    req.on('error',reject);
    req.setTimeout(20000,function(){req.destroy(new Error('timeout'));});
    if(bodyStr)req.write(bodyStr);
    req.end();
  });
}

async function backupTable(table){
  console.log('  →',table);
  try{
    var data=await httpsCall('GET',SB_URL,'/rest/v1/'+table+'?select=*&limit=50000',
      {'apikey':SB_SERVICE_KEY,'Authorization':'Bearer '+SB_SERVICE_KEY});
    var rows=Array.isArray(data)?data.length:0;
    console.log('    ✅',rows,'rows');
    return{table,rows,data:Array.isArray(data)?data:[],error:null};
  }catch(e){console.log('    ⚠️',e.message);return{table,rows:0,data:[],error:e.message};}
}

async function githubUpsert(filename,content,message){
  if(!GITHUB_TOKEN)return false;
  try{
    var existing=await httpsCall('GET','api.github.com','/repos/'+BACKUP_REPO+'/contents/'+filename,
      {'Authorization':'Bearer '+GITHUB_TOKEN,'User-Agent':'seenshown-backup','Accept':'application/vnd.github.v3+json'});
    var body={message,content:Buffer.from(content).toString('base64'),branch:'main'};
    if(existing&&existing.sha)body.sha=existing.sha;
    var r=await httpsCall('PUT','api.github.com','/repos/'+BACKUP_REPO+'/contents/'+filename,
      {'Authorization':'Bearer '+GITHUB_TOKEN,'User-Agent':'seenshown-backup','Accept':'application/vnd.github.v3+json','Content-Type':'application/json'},body);
    return r&&r.content;
  }catch(e){console.log('  GitHub error:',e.message);return false;}
}

async function run(){
  var now=new Date();
  var stamp=now.toISOString().slice(0,10);
  console.log('\n🔒 SeenShown Backup — '+now.toISOString());
  var results=[];
  var total=0;
  for(var t of TABLES){var r=await backupTable(t);results.push(r);total+=r.rows;}
  var manifest={backup_date:stamp,total_rows:total,tables:results.map(function(r){return{table:r.table,rows:r.rows};})};
  var full={manifest,tables:{}};
  results.forEach(function(r){full.tables[r.table]=r.data;});
  var dir=path.join(__dirname,'snapshots');
  if(!fs.existsSync(dir))fs.mkdirSync(dir,{recursive:true});
  fs.writeFileSync(path.join(dir,'backup_'+stamp+'.json'),JSON.stringify(full,null,2));
  console.log('\n📤 Pushing to GitHub...');
  await githubUpsert('snapshots/backup_'+stamp+'.json',JSON.stringify(full,null,2),'Backup '+stamp+' ('+total+' rows)');
  await githubUpsert('latest.json',JSON.stringify(full,null,2),'Latest backup '+stamp);
  await githubUpsert('manifest.json',JSON.stringify(manifest,null,2),'Manifest '+stamp);
  console.log('\n✅ Backup complete: '+total+' rows across '+TABLES.length+' tables\n');
}

run().catch(function(e){console.error('BACKUP FAILED:',e);process.exit(1);});
