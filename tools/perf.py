import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(channel='chrome',headless=True); pg=await b.new_page(viewport={'width':1280,'height':720})
        await pg.goto('http://localhost:8765/index.html'); await pg.wait_for_timeout(1200)
        r=await pg.evaluate("""async()=>{const P=SA.profile=SA.Save.reset();document.querySelector('#title').style.display='none';
          const mk=id=>{const q=SA.Save.newPart(id);P.parts.push(q);return q.uid};
          P.ships.push('arsenal');P.ship='arsenal';P.loadouts.arsenal={main:mk('crusher'),sub:['flamer','chain','intercept','hturret','mine'].map(mk),act:['gravity','orbital'].map(mk),pas:['slowfield','deflect','execute','shockplate','vault'].map(mk)};
          SA.Main.startRaid();const R=SA.R;R.player.hp=R.player.maxHp=1e9;
          for(let i=0;i<30;i++)SA.Combat.spawnEnemy(R,['k_frigate','e_frigate','k_turret'][i%3],R.player.x+Math.cos(i)*200,R.player.y+Math.sin(i)*200);
          SA.Input.mouse.down=true;
          let n=0;const t0=performance.now();
          await new Promise(res=>{const f=()=>{n++;if(n%60==0){R.wells.push({x:R.player.x,y:R.player.y-80,t:3,r:150});for(let k=0;k<6;k++)R.strikes.push({x:R.player.x+k*10,y:R.player.y-100,t:.5,r:42,dmg:30});}
            if(performance.now()-t0<6000)requestAnimationFrame(f);else res()};requestAnimationFrame(f)});
          return {fps:n/6,eb:R.eb.length,pb:R.pb.length,fx:R.fx.length}}""")
        print(r); await b.close()
asyncio.run(main())
