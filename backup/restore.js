#!/usr/bin/env node
/* ═══════════════════════════════════════════
   SEENSHOWN — EMERGENCY RESTORE
   Usage: node backup/restore.js [backup_date]
   Example: node backup/restore.js 2026-04-10
   Without date: restores from latest.json
═══════════════════════════════════════════ */

const https=require('https');
const fs=require('fs');
const path=require('path');

const SB_URL='vfcbdeawypooqcevuzac.supabase.co';
const SB_SERVICE_KEY=process.env.SUPABASE_SERVICE_KEY||'';

async function restore(date){
  var filename=date?'snapshots/backup_'+date+'.json':'latest.json';
  var localPath=path.join(__dirname,filename);
  var backup;
  if(fs.existsSync(localPath)){
    backup=JSON.parse(fs.readFileSync(localPath,'utf8'));
    console.log('📂 Loaded from local file:',localPath);
  } else {
    console.log('⚠️ Local file not found. Check backup/snapshots/ directory.');
    process.exit(1);
  }
  var manifest=backup.manifest;
  console.log('\n🔄 Restoring from backup: '+manifest.backup_date);
  console.log('   Total rows: '+manifest.total_rows);
  console.log('\n   THIS WILL OVERWRITE EXISTING DATA.');
  console.log('   Press Ctrl+C within 5 seconds to cancel.\n');
  await new Promise(function(r){setTimeout(r,5000);});
  for(var table of Object.keys(backup.tables)){
    var rows=backup.tables[table];
    if(!rows||!rows.length){console.log('  ⏭ Skipping empty table:',table);continue;}
    console.log('  ↩ Restoring',table,'(',rows.length,'rows)...');
    /* Upsert in batches of 100 */
    for(var i=0;i<rows.length;i+=100){
      var batch=rows.slice(i,i+100);
      try{
        await new Promise(function(resolve,reject){
          var body=JSON.stringify(batch);
          var req=https.request({method:'POST',hostname:SB_URL,path:'/rest/v1/'+table,
            headers:{'apikey':SB_SERVICE_KEY,'Authorization':'Bearer '+SB_SERVICE_KEY,'Content-Type':'application/json','Prefer':'resolution=merge-duplicates','Content-Length':Buffer.byteLength(body)}},
            function(res){var d='';res.on('data',function(c){d+=c;});res.on('end',function(){resolve(d);});});
          req.on('error',reject);req.write(body);req.end();
        });
      }catch(e){console.log('    Batch error:',e.message);}
    }
    console.log('  ✅',table,'restored');
  }
  console.log('\n✅ RESTORE COMPLETE\n');
}

restore(process.argv[2]);
