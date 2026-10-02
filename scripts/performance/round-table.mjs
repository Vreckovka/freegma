// Keep previous verified results separate from this round's affected metrics.
// Numeric noise alone must not label an unrelated metric as a current change.
export function roundTable(report,previousReport,changedNames=[]){
 const previous=new Map(),threeColumns=previousReport.includes('| Measurement | Baseline | Improved | Current |');
 for(const line of previousReport.split('\n')){
  if(!line.startsWith('| '))continue;
  const cells=line.split('|').slice(1,-1).map(s=>s.trim().replaceAll('**',''));
  if(cells[0]==='Measurement'||/^---/.test(cells[0]))continue;
  previous.set(cells[0],threeColumns?(cells[3]||cells[2]):cells[2]);
 }
 const changed=new Set(changedNames);
 return report.split('\n').map(line=>{
  if(!line.startsWith('| '))return line;
  const cells=line.split('|').slice(1,-1).map(s=>s.trim());
  if(cells[0]==='Measurement')return '| Measurement | Baseline | Improved | Current |';
  if(/^---/.test(cells[0]))return '| --- | ---: | ---: | ---: |';
  const active=changed.has(cells[0]),values=[cells[0],cells[1],previous.get(cells[0])||'Not measured',active?cells[2]:''];
  return '| '+values.map(v=>active&&v?'**'+v+'**':v).join(' | ')+' |';
 }).join('\n');
}
