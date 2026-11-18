import asyncio,json
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(channel='chrome',headless=True); pg=await b.new_page(viewport={'width':1280,'height':720})
        errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.goto('http://localhost:8765/index.html'); await pg.wait_for_timeout(1200)
        ids=await pg.evaluate("()=>Object.keys(SA.PARTS)")
        bySlot=await pg.evaluate("()=>{const o={main:[],sub:[],act:[],pas:[]};for(const k in SA.PARTS)o[SA.PARTS[k].slot].push(k);return o}")
        res={}
        # groups: each main with 5 subs/2 acts/5 pas cycling
        acts=bySlot['act']; subs=bySlot['sub']; pas=bySlot['pas']; mains=bySlot['main']
        rounds=max(len(mains),(len(acts)+1)//2,(len(subs)+4)//5,(len(pas)+4)//5)
        for r in range(rounds):
            lo={'main':mains[r%len(mains)],'sub':[subs[(r*5+i)%len(subs)] for i in range(5)],'act':[acts[(r*2+i)%len(acts)] for i in range(2)],'pas':[pas[(r*5+i)%len(pas)] for i in range(5)]}
            await pg.evaluate("""(lo)=>{const P=SA.profile=SA.Save.reset();document.querySelector('#title').style.display='none';
              const mk=id=>{const q=SA.Save.newPart(id);P.parts.push(q);return q.uid};
              P.ships.push('arsenal');P.ship='arsenal';P.loadouts.arsenal={main:mk(lo.main),sub:lo.sub.map(mk),act:lo.act.map(mk),pas:lo.pas.map(mk)};
              SA.Main.startRaid();const R=SA.R;R.player.hp=R.player.maxHp=1e6;
              for(let i=0;i<6;i++)SA.Combat.spawnEnemy(R,i%2?'k_fighter':'e_frigate',R.player.x+60+i*20,R.player.y-80);
              for(let i=0;i<5;i++)SA.R.cargo.items.length<3&&SA.Grid.add(R.cargo,'scrap');}""",lo)
            await pg.mouse.move(640,200); await pg.mouse.down()
            for k in ['KeyQ','KeyE']:
                await pg.keyboard.down(k); await pg.wait_for_timeout(700); await pg.keyboard.up(k); await pg.wait_for_timeout(400)
            await pg.keyboard.down('KeyD'); await pg.wait_for_timeout(1500); await pg.keyboard.up('KeyD')
            await pg.mouse.up()
            st=await pg.evaluate("()=>({kills:SA.R.kills,hp:SA.R.player.hp,pb:SA.R.pb.length,eb:SA.R.eb.length,cd:SA.R.player.acts.map(a=>a&&a.cd)})")
            print(r,lo['main'],lo['act'],st,errs[-1:] if errs else '')
        print('ERRORS',len(errs),errs[:5])
        await b.close()
asyncio.run(main())
