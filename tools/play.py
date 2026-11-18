import asyncio, sys, json
from playwright.async_api import async_playwright
URL = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8765/index.html'
OUT = '/home/claude/tests/'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--autoplay-policy=no-user-gesture-required'])
        pg = await b.new_page(viewport={'width': 1280, 'height': 720})
        errs = []
        pg.on('console', lambda m: errs.append(f'{m.type}: {m.text}') if m.type in ('error', 'warning', 'assert') else None)
        pg.on('pageerror', lambda e: errs.append(f'PAGEERROR: {e}'))
        await pg.goto(URL); await pg.wait_for_timeout(800); await pg.evaluate('localStorage.clear()'); await pg.reload(); await pg.wait_for_timeout(1500)
        await pg.screenshot(path=OUT + '01_title.png')
        await pg.click('#title-start'); await pg.wait_for_timeout(500)
        await pg.screenshot(path=OUT + '02_hangar.png')
        for t in ['stash', 'bench', 'shop', 'contracts', 'records', 'sortie']:
            await pg.click(f'#hg-tabs button[data-tab="{t}"]'); await pg.wait_for_timeout(150)
        await pg.click('#hg-body .btn.big'); await pg.wait_for_timeout(800)
        await pg.mouse.move(800, 300)
        await pg.screenshot(path=OUT + '03_raid.png')
        # 이동 + 사격
        await pg.mouse.move(700, 250); await pg.mouse.down()
        await pg.keyboard.down('KeyW'); await pg.wait_for_timeout(1500); await pg.keyboard.up('KeyW')
        await pg.keyboard.down('KeyD'); await pg.wait_for_timeout(1000); await pg.keyboard.up('KeyD')
        await pg.keyboard.press('KeyQ'); await pg.keyboard.press('KeyE'); await pg.keyboard.press('Space')
        await pg.wait_for_timeout(500)
        await pg.mouse.up()
        await pg.screenshot(path=OUT + '04_combat.png')
        # 플레이어를 포대 기지 근처로 옮겨 탄막 확인
        await pg.evaluate("""()=>{const R=SA.R;const tb=R.pois.find(p=>p.type==='turrets');R.player.x=tb.x+120;R.player.y=tb.y;R.player.invuln=99;}""")
        await pg.wait_for_timeout(2500)
        await pg.screenshot(path=OUT + '05_bullets.png')
        # 아이템 몇 개 주고 탭
        await pg.evaluate("""()=>{const R=SA.R;['core','engine','scrap','wire','goldchip','canister'].forEach(id=>SA.Grid.add(R.cargo,id));for(let i=0;i<3;i++)SA.Raid.spawnItem(R,'debris',R.player.x+20,R.player.y);R.items.forEach(i=>{i.full=true});}""")
        await pg.keyboard.press('Tab'); await pg.wait_for_timeout(600)
        await pg.screenshot(path=OUT + '06_tab.png')
        # 드래그: 화물칸 첫 아이템을 보안칸으로
        box = await pg.locator('#tw-cargo .item').first.bounding_box()
        sec = await pg.locator('#tw-secure').bounding_box()
        await pg.mouse.move(box['x']+8, box['y']+8); await pg.mouse.down()
        await pg.mouse.move(sec['x']+10, sec['y']+10, steps=5); await pg.mouse.up()
        await pg.wait_for_timeout(200)
        n_sec = await pg.evaluate("SA.R.secure.items.length")
        # 근처 아이템 더블클릭
        g = pg.locator('#tw-ground .gitem')
        print('ground items', await g.count(), 'secure', n_sec)
        await pg.screenshot(path=OUT + '07_tab_after.png')
        await pg.keyboard.press('Tab'); await pg.wait_for_timeout(200)
        # 스마트 교체: 화물칸을 고철로 꽉 채우고 금빛 회로를 옆에
        sw = await pg.evaluate("""()=>{const R=SA.R;R.cargo.items=[];while(SA.Grid.add(R.cargo,'scrap'));R.items=[];SA.Raid.spawnItem(R,'goldchip',R.player.x+5,R.player.y);R.items[0].t=1;return SA.Grid.value(R.cargo)}""")
        await pg.wait_for_timeout(700)
        await pg.screenshot(path=OUT + '07b_swap_hint.png')
        await pg.keyboard.press('KeyF'); await pg.wait_for_timeout(300)
        print('swap: before', sw, 'after', await pg.evaluate("SA.Grid.value(SA.R.cargo)"), 'gold in cargo', await pg.evaluate("SA.Grid.count(SA.R.cargo,'goldchip')"))
        await pg.keyboard.press('Tab'); await pg.wait_for_timeout(200)
        await pg.keyboard.press('Tab'); await pg.wait_for_timeout(200)
        # 탈출 테스트
        await pg.evaluate("""()=>{const R=SA.R;const x=R.extracts.find(e=>e.active);R.player.x=x.x;R.player.y=x.y;R.player.invuln=99;R.eb=[];R.enemies.forEach(e=>e.dead=true);}""")
        await pg.wait_for_timeout(11500)
        await pg.screenshot(path=OUT + '08_result.png')
        st = await pg.evaluate("JSON.stringify({credits:SA.profile.credits,stash:SA.profile.stash.items.length,contracts:SA.profile.contracts})")
        print('after extract', st)
        await pg.click('#result-go'); await pg.wait_for_timeout(400)
        await pg.click('#hg-tabs button[data-tab="contracts"]'); await pg.wait_for_timeout(200)
        await pg.screenshot(path=OUT + '09_contracts.png')
        await pg.click('#hg-tabs button[data-tab="stash"]'); await pg.wait_for_timeout(200)
        await pg.screenshot(path=OUT + '10_stash.png')
        # 격추 테스트
        await pg.click('#hg-tabs button[data-tab="sortie"]'); await pg.click('#hg-body .btn.big'); await pg.wait_for_timeout(500)
        await pg.evaluate("""()=>{SA.Grid.add(SA.R.cargo,'engine');SA.R.player.invuln=0;SA.Combat.hurtPlayer(SA.R,999)}""")
        await pg.wait_for_timeout(5000)
        await pg.screenshot(path=OUT + '11_death.png')
        print('pilot', await pg.evaluate("JSON.stringify(SA.profile.pilots)"))
        # 성능: 탄 2000개
        await pg.click('#result-go'); await pg.wait_for_timeout(300)
        await pg.click('#hg-tabs button[data-tab="sortie"]'); await pg.wait_for_timeout(200)
        await pg.click('#hg-body .btn.big'); await pg.wait_for_timeout(500)
        fps = await pg.evaluate("""()=>new Promise(res=>{const R=SA.R;R.player.invuln=999;for(let i=0;i<2000;i++)SA.Combat.eb(R,R.player.x+Math.random()*600-300,R.player.y+Math.random()*300-150,Math.random()*6.28,30,{life:30});let n=0;const t0=performance.now();const f=()=>{n++;if(performance.now()-t0<2000)requestAnimationFrame(f);else res(n/2)};requestAnimationFrame(f);})""")
        print('fps with 2000 bullets (headless)', fps)
        await pg.screenshot(path=OUT + '12_stress.png')
        print('\n'.join(errs) or 'NO CONSOLE ERRORS')
        await b.close()
asyncio.run(main())
