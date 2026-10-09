/** Durable append-only campaign budget. No answers, cookies, customer data or session paths are logged. */
import fs from 'node:fs';
import path from 'node:path';
import type { AttemptLedger, RefreshJob } from './finalQuoteRefresh';
export function createFileFinalQuoteLedger(directory: string, campaignId: string): AttemptLedger & { release(): void } {
  if(!/^[a-zA-Z0-9_-]{1,80}$/.test(campaignId))throw new Error('Invalid campaign identity');
  fs.mkdirSync(directory,{recursive:true,mode:0o700});
  const lock=path.join(directory,`${campaignId}.worker.lock`), file=path.join(directory,`${campaignId}.jsonl`);
  const lockFd=fs.openSync(lock,'wx',0o600); // Held for the entire worker lifecycle, including network waits.
  let active=true;
  function read() { return fs.existsSync(file)?fs.readFileSync(file,'utf8').split(/\r?\n/).filter(Boolean).map(l=>JSON.parse(l)):[]; }
  function append(row:object) { const fd=fs.openSync(file,'a',0o600);try{fs.writeSync(fd,JSON.stringify(row)+'\n');fs.fsyncSync(fd);}finally{fs.closeSync(fd);} }
  return {
    async reservedJobKeys(){
      if(!active)throw new Error('Worker released');
      return read().filter(r=>r.kind==='RESERVED').map(r=>r.key);
    },
    async lastStartTime(){
      if(!active)throw new Error('Worker released');
      const rows=read().filter(r=>r.kind==='RESERVED');
      return rows.length?Date.parse(rows[rows.length-1].startedAt):null;
    },
    async reserve(job:RefreshJob,ceiling:number){
      if(!active)throw new Error('Worker released');
      const rows=read(),reservations=rows.filter(r=>r.kind==='RESERVED');
      if(rows.some(r=>r.kind==='OUTCOME'&&r.detail==='AUTH_OR_CAPTCHA_STOP'))throw new Error('Campaign stopped after authentication or CAPTCHA failure');
      // A campaign cannot acquire extra budget by restarting with a larger command-line value.
      if(rows.some(r=>r.kind==='CAMPAIGN'&&r.ceiling!==ceiling))throw new Error('Campaign ceiling mismatch');
      if(!rows.length)append({kind:'CAMPAIGN',campaignId,ceiling});
      if(reservations.some(r=>r.key===job.key))throw new Error('Job already reserved in this campaign');
      if(reservations.length>=ceiling)throw new Error('Campaign exhausted');
      const attempt=reservations.length+1;append({kind:'RESERVED',attempt,key:job.key,startedAt:new Date().toISOString()});return{attempt};
    },
    async finish(attempt,outcome,detail){
      if(!active)throw new Error('Worker released');
      const rows=read();if(!rows.some(r=>r.kind==='RESERVED'&&r.attempt===attempt)||rows.some(r=>r.kind==='OUTCOME'&&r.attempt===attempt))throw new Error('Invalid or duplicate outcome');
      append({kind:'OUTCOME',attempt,outcome,detail,finishedAt:new Date().toISOString()});
    },
    release(){if(active){active=false;fs.closeSync(lockFd);fs.unlinkSync(lock);}},
  };
}
