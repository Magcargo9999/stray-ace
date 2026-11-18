import asyncio,json,sys,statistics as S
from playwright.async_api import async_playwright
CFGS={
 'hex 기본': {'ship':'hex','main':'pulse','sub':['mg','mg'],'act':['missile','purge'],'pas':['magnet'],'pilot':'kai'},
 '근접 돌격(바스티온)': {'ship':'bastion','main':'crusher','sub':['flamer','chain'],'act':['emp','harpoon'],'pas':['execute','shockplate','counter','barrier'],'pilot':'bruno'},
 '스침 장인(스위프트)': {'ship':'swift','main':'twin','sub':['gzcharge'],'act':['discharge','timestop'],'pas':['grazeamp','grazeflow','slowfield'],'pilot':'raven'},
 '포대 요새(아스날)': {'ship':'arsenal','main':'pulse','sub':['hturret','intercept','intercept','drone','chain'],'act':['gravity','orbital'],'pas':['cooler','slowfield','deflect','engine2','magnet'],'pilot':'mina'},
 '파밍 도주(헥스)': {'ship':'hex','main':'rail','sub':['drone','mine'],'act':['dump','convert'],'pas':['magnet','cargo','secure2'],'pilot':'jet'},
}
N=int(sys.argv[1]) if len(sys.argv)>1 else 6
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(channel='chrome',headless=True); pg=await b.new_page(viewport={'width':1280,'height':720})
        errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.goto('http://localhost:8765/index.html'); await pg.wait_for_timeout(1200)
        await pg.add_script_tag(path='bot.js')
        out={}
        for name,c in CFGS.items():
            if len(sys.argv)>2 and sys.argv[2] not in name: continue
            rs=[]
            for i in range(N):
                await pg.evaluate("""(c)=>{const P=SA.profile=SA.Save.reset();document.querySelector('#title').style.display='none';
                  const mk=id=>{const q=SA.Save.newPart(id);P.parts.push(q);return q.uid};
                  if(!P.ships.includes(c.ship))P.ships.push(c.ship);P.ship=c.ship;P.pilots[c.pilot]={injury:0};P.pilot=c.pilot;
                  P.loadouts[c.ship]={main:mk(c.main),sub:c.sub.map(mk),act:c.act.map(mk),pas:c.pas.map(mk)};
                  SA.profile.stats.raids=0; window.__c0=P.credits; BOT.start({});}""",c)
                r=None
                for k in range(40):
                    r=await pg.evaluate("()=>BOT.run(15)")
                    if r['done']: break
                res=await pg.evaluate("()=>({ok:SA.profile.stats.extracts>0, val:SA.profile.stats.bestValue, stash:SA.Grid.value(SA.profile.stash), kills:SA.R?SA.R.kills:0})")
                rs.append({**r,**res})
            ok=[x for x in rs if x['ok']]
            out[name]={'탈출률':f"{len(ok)}/{N}",'평균시간':round(S.mean(x['t'] for x in rs)),'평균격추':round(S.mean(x['kills'] for x in rs),1),
                       '평균가치(탈출)':round(S.mean(x['stash'] for x in ok)) if ok else 0,'평균침식':round(S.mean(x['corr'] for x in rs))}
            print(name,out[name],flush=True)
        json.dump(out,open('sim_result.json','w'),ensure_ascii=False,indent=1)
        print('errs',errs[:3]); await b.close()
asyncio.run(main())
