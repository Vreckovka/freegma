"""Exact fixed-tokenizer comparison of captured local MCP payloads, not billing."""
import sys,json,pathlib,importlib.metadata
import tiktoken
source=pathlib.Path(sys.argv[1]); output=source.with_name(source.name.replace('-payloads.json','.json'))
if output.exists(): raise RuntimeError('Preserve the existing token measurement')
data=json.loads(source.read_text(encoding='utf-8')); enc=tiktoken.get_encoding('o200k_base')
encode=lambda text:len(enc.encode(text,disallowed_special=()))
stringify=lambda value:json.dumps(value,ensure_ascii=False,separators=(',',':'))
metrics={}
for sample in data['samples']:
    result=sample['result']; wire=stringify(result)
    texts='\n'.join(block.get('text','') for block in result.get('content',[]))
    structured=stringify(result['structuredContent']) if 'structuredContent' in result else ''
    rendered=texts+('\n'+structured if structured else '') if texts or structured else wire
    metrics[sample['key']]={'requestTokens':encode(sample['request']),'responseTokens':encode(rendered),'wireTokens':encode(wire),'responseBytes':len(wire.encode('utf-8'))}
result={k:data[k] for k in ['format','label','compact','sourceCommit','fixture']}
result.update(tokenizer={'name':'o200k_base','package':'tiktoken','version':importlib.metadata.version('tiktoken'),'scope':'MCP text plus structured content; client rendering and actual billing may differ'},metrics=metrics)
output.write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'label':data['label'],'tokens':{k:v['responseTokens'] for k,v in metrics.items()}},indent=2))
