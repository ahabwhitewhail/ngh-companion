// Two-browser table test: Narrator + two players over real WebRTC, local signaling.
const { chromium } = require('playwright')
const URL = process.argv[2]
const shots = process.argv[3]
const wait = ms => new Promise(r => setTimeout(r, ms))
const state = p => p.evaluate(() => JSON.parse(localStorage.getItem('ngh-companion.v1')))
const cards = d => [...d.deck.draw, ...d.deck.discard, ...d.deck.table, ...d.characters.flatMap(c => c.hand)]
const check = (name, ok, info = '') => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${info ? ' — ' + info : ''}`); if (!ok) process.exitCode = 1 }

;(async () => {
  const b = await chromium.launch()
  const mk = async () => { const c = await b.newContext({ viewport: { width: 400, height: 900 }, locale: 'ru-RU' }); const p = await c.newPage(); p.on('pageerror', e => console.log('pageerror', e.message)); await p.goto(URL); await wait(400); return p }
  const host = await mk(), p1 = await mk(), p2 = await mk()
  const tab = (p, i) => p.click(`.tab >> nth=${i}`)

  // Narrator creates the table
  await tab(host, 3); await host.click('#tbl-host .btn-primary'); await wait(300)
  const code = (await host.textContent('.code')).replace(/\s/g, '')
  check('table code shown', /^[A-Z0-9]{6}$/.test(code), code)

  // Players rename their example soldiers and join
  for (const [p, name] of [[p1, 'Алиса'], [p2, 'Борис']]) {
    await p.click('.card'); await p.fill('#f-name', name); await wait(500)
    await tab(p, 3); await p.fill('#tbl-code', code); await p.click('#tbl-join .btn-primary')
  }
  await host.waitForFunction(() => document.querySelectorAll('.party .seat').length === 2, null, { timeout: 30000 }).catch(() => {})
  check('both players appear at the Narrator', (await host.$$('.party .seat')).length === 2)
  await p1.waitForSelector('.net-online', { timeout: 15000 }).catch(() => {})
  check('player 1 connected', !!(await p1.$('.net-online')))

  // Narrator gives a reward to Алиса
  const seat = host.locator('.seat', { hasText: 'Алиса' })
  await seat.locator('.stepper .step >> nth=1').click()   // reward 2
  await seat.locator('button', { hasText: 'Выдать 2' }).click(); await wait(800)
  let s1 = await state(p1)
  const alice = s1.characters.find(c => c.name === 'Алиса')
  check('reward reaches player hand', alice.hand.length === 2, `hand ${alice.hand.length}`)

  // Player draws one from the table deck
  await tab(p1, 2); await p1.click('button:has-text("Взять карту")'); await wait(800)
  let hs = await state(host)
  const hostAlice = hs.characters.find(c => c.name === 'Алиса')
  check('player draw lands on Narrator device', hostAlice.hand.length === 3, `host sees ${hostAlice.hand.length}`)
  check('deck conserved on Narrator (54 unique)', new Set(cards(hs)).size === 54 && cards(hs).length === 54, `${cards(hs).length}/${new Set(cards(hs)).size}`)

  // Player burns a card to heal (Body is 3/4 on the example)
  await p1.click('.hand .pcard:not(.pcard-slot) >> nth=0'); await p1.click('text=Сжечь для лечения')
  await p1.click('.sub-panel .btn >> nth=0'); await wait(900)
  s1 = await state(p1)
  check('heal applied on player sheet via table', s1.characters.find(c => c.name === 'Алиса').attrs.brawn.cur === 4, JSON.stringify(s1.characters.find(c => c.name === 'Алиса').attrs.brawn))

  // Narrator wounds Борис: Guts −1
  const seatB = host.locator('.seat', { hasText: 'Борис' })
  const gutsBefore = (await state(p2)).characters.find(c => c.name === 'Борис').attrs.guts.cur
  await seatB.locator('.seat-a >> nth=2').locator('button >> nth=0').click(); await wait(900)
  const gutsAfter = (await state(p2)).characters.find(c => c.name === 'Борис').attrs.guts.cur
  check('Narrator wound reaches player', gutsAfter === gutsBefore - 1, `${gutsBefore} → ${gutsAfter}`)

  // Corruption draw for Алиса: secret from Борис
  await p1.click('#hand-corr .btn'); await wait(900)
  check('player sees own Corruption card', !!(await p1.$('.reveal')))
  await p1.click('.reveal').catch(() => {})
  await tab(p2, 2); await p2.click('[role=tab] >> text=Колода'); await wait(300)
  const p2log = await p2.textContent('#deck-log')
  check('other player sees Corruption draw only as hidden', p2log.includes('Алиса: проверка Скверны (скрыто)') && !/Алиса: проверка Скверны, (чёрная|красная)/.test(p2log))
  check('other player does not see Алиса’s drawn cards', !(await p2.$$eval('#deck-log .log-e', els => els.some(e => e.textContent.includes('Алиса: взято') && e.querySelector('.mini-card')))))

  // Борис rolls: the roll shows in the Narrator's feed
  await tab(p2, 1); await p2.selectOption('#dice-src', 'skill:ranged'); await p2.click('.btn-roll'); await wait(1000)
  await tab(host, 3); await wait(300)
  const feed = await host.textContent('#tbl-feed')
  check('player roll in Narrator feed', feed.includes('Борис'))

  // Initiative: Алиса shows a card, Narrator adds an Antagonist
  await tab(p1, 2); await p1.click('[role=tab] >> text=Инициатива'); await p1.click('.init-pc .pcard >> nth=0'); await wait(700)
  await tab(host, 2); await host.click('[role=tab] >> text=Инициатива'); await host.fill('#npc-name', 'Окопный Охотник'); await host.click('#init-npc .btn'); await wait(700)
  const order1 = await p1.$$eval('.init-order .io', els => els.length)
  check('initiative shared with players', order1 === 2, `p1 sees ${order1}`)

  await host.screenshot({ path: shots + '/t-host.png', fullPage: true })
  await tab(host, 3); await wait(200); await host.screenshot({ path: shots + '/t-host-table.png', fullPage: true })
  await tab(p2, 3); await wait(200); await p2.screenshot({ path: shots + '/t-player.png', fullPage: true })

  // Journey: Борис has no cards (one comes from the deck), Алиса picks one; Narrator deals and finishes
  await tab(p1, 2); await p1.click('[role=tab] >> text=Путешествие'); await p1.click('.init-pc .pcard >> nth=0'); await wait(700)
  await tab(host, 2); await host.click('[role=tab] >> text=Путешествие'); await wait(300)
  await host.click('button:has-text("Перемешать и раздать")'); await wait(900)
  const dealtHost = await host.$$eval('.j-dealt .jd', els => els.length)
  const dealtP2 = await p2.evaluate(() => 0)
  check('Journey dealt to both seats', dealtHost === 2, `${dealtHost}`)
  hs = await state(host)
  check('deck conserved during Journey', new Set(cards(hs)).size === 54 && cards(hs).length === 54)
  await host.click('button:has-text("Сбросить карты Путешествия")'); await wait(700)
  hs = await state(host)
  check('deck conserved after Journey', new Set(cards(hs)).size === 54 && cards(hs).length === 54 && !hs.journey)

  // Борис reloads the page: the app reconnects to the same table by itself
  await p2.reload(); await wait(500)
  await tab(p2, 3)
  await p2.waitForSelector('.net-online', { timeout: 20000 }).catch(() => {})
  check('player reconnects after reload', !!(await p2.$('.net-online')))

  // Player leaves: their own device keeps a full, valid deck again
  await tab(p1, 3); await p1.click('button:has-text("Встать из-за стола")'); await p1.click('text=Нажмите ещё раз'); await wait(800)
  s1 = await state(p1)
  check('player leave restores a valid local deck', new Set(cards(s1)).size === 54 && cards(s1).length === 54, `${cards(s1).length}`)
  hs = await state(host)
  check('Narrator deck still conserved', new Set(cards(hs)).size === 54 && cards(hs).length === 54)
  await b.close()
})()
