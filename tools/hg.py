import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(channel='chrome',headless=True); pg=await b.new_page(viewport={'width':1280,'height':900})
        errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.goto('http://localhost:8765/index.html'); await pg.wait_for_timeout(1000)
        await pg.evaluate("""()=>{localStorage.setItem('strayace_profile_v1',JSON.stringify(Object.assign(SA.Save.reset(),{recipes:['twin','plating'],credits:5000})));
          const s=JSON.parse(localStorage.getItem('strayace_profile_v1'));s.stash.items.push({uid:'x1',id:'fuel',x:0,y:0,rot:0});localStorage.setItem('strayace_profile_v1',JSON.stringify(s));
          SA.profile=SA.Save.load();document.querySelector('#title').style.display='none';SA.Hangar.open();SA.Hangar.go('shop')}""")
        await pg.wait_for_timeout(400); await pg.screenshot(path='91_shop.png',full_page=True)
        print(await pg.evaluate("()=>[SA.profile.credits,SA.profile.recipes.join(),SA.profile.stash.items.length,JSON.stringify(SA.profile.deliv)]"))
        await pg.evaluate("()=>SA.Hangar.go('bench')"); await pg.wait_for_timeout(300); await pg.screenshot(path='92_bench.png')
        print(errs); await b.close()
asyncio.run(main())
