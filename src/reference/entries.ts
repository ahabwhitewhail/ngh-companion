// The built-in rules reference: summaries in our own words with rulebook page numbers.
// Body text: one paragraph per line; lines starting with "- " are bullets.
import { PATHS, SKILLS, WEAPONS } from '../rules'
import { ANTAGONISTS } from './antagonists'
import { PATH_TEXT, RITUAL_TEXT } from './rituals'

export type L = { ru: string; en: string }
export type Cat = 'basics' | 'creation' | 'skills' | 'rolls' | 'combat' | 'damage' | 'corruption' | 'magic' | 'gear' | 'conditions' | 'antagonists' | 'glossary'
export const CATS: Cat[] = ['basics', 'creation', 'skills', 'rolls', 'combat', 'damage', 'corruption', 'magic', 'gear', 'conditions', 'antagonists', 'glossary']
export const CAT_NAME: Record<Cat, L> = {
  basics: { ru: 'Основные правила', en: 'Core rules' },
  creation: { ru: 'Создание персонажа', en: 'Character creation' },
  skills: { ru: 'Характеристики и навыки', en: 'Attributes and skills' },
  rolls: { ru: 'Проверки и броски', en: 'Rolls and checks' },
  combat: { ru: 'Бой', en: 'Combat' },
  damage: { ru: 'Урон и ранения', en: 'Damage and wounds' },
  corruption: { ru: 'Скверна', en: 'Corruption' },
  magic: { ru: 'Шёпот и ритуалы', en: 'Whispers and rituals' },
  gear: { ru: 'Оружие и снаряжение', en: 'Weapons and gear' },
  conditions: { ru: 'Состояния и эффекты', en: 'Conditions and effects' },
  antagonists: { ru: 'Противники', en: 'Antagonists' },
  glossary: { ru: 'Термины', en: 'Glossary' },
}

export interface RefEntry { id: string; cat: Cat; page?: number; title: L; body: L; custom?: boolean }

const E = (id: string, cat: Cat, page: number | undefined, title: L, body: L): RefEntry => ({ id, cat, page, title, body })

const BASE: RefEntry[] = [
  // ---- Core rules ----
  E('roll', 'basics', 3, { ru: 'Проверка навыка', en: 'Skill roll' }, {
    ru: 'Бросьте столько к6, сколько у навыка отметок обучения. Каждая 5 или 6 — успех.\nУспехов должно быть не меньше Целевого числа (СЛ). СЛ задаёт Миссия или Рассказчик.\nЗапись «Стрельба: СЛ 3» значит: кубы по обучению, манипуляции по атрибуту, нужно 3 успеха.\nПровал просто значит, что задуманное не случилось.',
    en: 'Roll as many d6 as your training in the skill. Each 5 or 6 is a success.\nYou need at least as many successes as the Target Number (TN), set by the Mission or the Narrator.\n“Ranged: TN 3” means: dice from training, manipulations from the attribute, 3 successes needed.\nFailure simply means the attempt does not happen.' }),
  E('challenge', 'basics', 4, { ru: 'Испытание', en: 'Challenge' }, {
    ru: 'Серьёзная преграда, которую отряд проходит вместе: каждый участник бросает свой навык, успехи складываются.\nЗапись «Испытание Скрытность: СЛ 6».\nВ отличие от обычной проверки, провал Испытания может нести наказание.\nРассказчик может превратить любую проверку в Испытание. Отряд может атаковать вместе: успехи складываются, но урон наносит только одно оружие (с. 62).',
    en: 'A major obstacle the Unit overcomes together: each participant rolls, successes are pooled.\nWritten “Challenge Stealth: TN 6”.\nUnlike a skill roll, failing a Challenge can carry a penalty.\nThe Narrator may turn any roll into a Challenge. The Unit can attack together: successes pool, but only one weapon deals damage (p.62).' }),
  E('cards', 'basics', 6, { ru: 'Колода и масти', en: 'The deck and suits' }, {
    ru: 'Обычная колода: 52 карты и 2 джокера; на 6+ игроков — две колоды вместе. Карты — это воспоминания солдата: сыгранная карта значит, что он что-то о себе забыл.\n- Пики — Знание: учиться, расти, превозмогать страдание.\n- Трефы — Вещи: препятствия, действие, приключение.\n- Червы — Отношения: чувства и связь.\n- Бубны — Я: стремления и надежды.\nТуз старший. На руке не больше 7 карт, рука держится в тайне. Сыгранные карты уходят в сброс Рассказчика.',
    en: 'A standard 52-card deck with 2 jokers; for 6+ players shuffle two decks together. Cards are a soldier’s memories: playing one means forgetting something about yourself.\n- Spades — Knowledge: learning, growing, overcoming suffering.\n- Clubs — Things: obstacles, action, adventure.\n- Hearts — Relationships: emotion, connection.\n- Diamonds — Self: ambition, hopes.\nAces are high. Maximum hand is 7, kept secret. Played cards go to the Narrator’s discard.' }),
  E('jokers', 'basics', 7, { ru: 'Джокеры', en: 'Jokers' }, {
    ru: 'Джокер — дикая карта: каждый раз считается одной любой не-джокерной картой.\nКогда джокер сыгран или открыт по любой причине, колоду перетасовывают вместе с ним.\nЧёрный джокер вдобавок вызывает проверку Скверны.\nКакой джокер красный, а какой чёрный, решите до игры.',
    en: 'A joker is wild: each time it counts as one non-joker card.\nWhenever a joker is played or revealed, reshuffle the deck including it.\nThe black joker also triggers a draw for Corruption.\nAgree before play which joker is red and which is black.' }),
  E('card-uses', 'basics', 7, { ru: 'Для чего нужны карты', en: 'What cards are for' }, {
    ru: '- Путешествие: каждый вносит хотя бы одну карту; у кого нет карт — карта из колоды не глядя.\n- Инициатива: показать карту, не сбрасывая её.\n- +One: потратить карту, чтобы добавить одну манипуляцию к броску.\n- Шёпот: многие Пути требуют сжечь карту.\n- Лечение: в бою карта поглощает 1 урон; вне боя — +1 к любому атрибуту.\n- Развитие: в конце Миссии наборы карт покупают ранги и навыки.\nКарты дают за выживание в Миссии, особые задания, победу над Противником или просто за отличную игру.',
    en: '- Journey: everyone adds at least one card; with no cards, one from the deck unseen.\n- Initiative: show a card without discarding it.\n- +One: spend a card to add one manipulation to a roll.\n- Whispers: many Paths require burning a card.\n- Healing: in combat a card negates 1 damage; out of combat it heals 1 point of any attribute.\n- Growth: at the end of a Mission sets of cards buy ranks and skills.\nCards are earned for surviving Missions, special tasks, defeating Antagonists, or just great play.' }),
  E('mission', 'basics', 60, { ru: 'Миссия', en: 'Mission' }, {
    ru: 'Короткое приключение примерно на час. Досье Миссии: брифинг (для Рассказчика) и задача (для игроков), Путешествие, Происшествия и Награда — новые карты.\nПосле Миссии: все атрибуты восстанавливаются до ранга, затем развитие за карты, затем Рассказчик замешивает весь сброс обратно в колоду.\nСкверна в конце Миссии не исчезает.',
    en: 'A short adventure of about an hour. A Mission Folio has a Briefing (Narrator) and Objective (players), the Journey, Incidents, and a Decoration — new cards.\nAfter a Mission: all attributes heal to their rank, then growth with cards, then the Narrator shuffles all discards back into the deck.\nCorruption is not cleared at the end of a Mission.' }),
  E('journey', 'basics', 60, { ru: 'Путешествие', en: 'The Journey' }, {
    ru: 'Начало каждой Миссии, задаёт тон. У Путешествия есть Условие (например, «три червы») и иногда то, чего избегать («без шестёрок»).\n- Каждый вносит хотя бы одну карту втайне; у кого нет карт — карта из колоды не глядя.\n- С общего согласия можно добавить карты из колоды, но не больше числа игроков.\n- За Скверну 3 Рассказчик может добавить по карте, за 4 — до двух.\n- Рассказчик тасует и раздаёт карты рубашкой вверх; лишние берёт себе.\n- По очереди открывают карту и около минуты отвечают на вопрос от лица героя или описывают сцену по теме масти; чем старше карта, тем напряжённее.\nПосле — бонус или штраф по Условию, карты в сброс. Чёрный джокер — сначала проверка Скверны.',
    en: 'The opening of each Mission, setting the tone. A Journey has a Requirement (e.g. “three hearts”) and sometimes things to avoid (“no sixes”).\n- Everyone secretly adds at least one card; with no cards, one from the deck unseen.\n- By consensus, extra cards from the deck, never more than the number of players.\n- For Corruption 3 the Narrator may add a card, for 4 up to two.\n- The Narrator shuffles and deals them face down, keeping any extras.\n- In turn, reveal and spend about a minute answering in character or narrating a scene on the suit’s theme; higher cards are more intense.\nThen the Requirement’s bonus or penalty; cards are discarded. A black joker means a Corruption draw first.' }),
  E('difficulty', 'basics', 62, { ru: 'Плавающая сложность', en: 'Floating difficulty' }, {
    ru: 'Примерно половина проверок должна проваливаться. Рассказчик поднимает или опускает СЛ под отряд, добавляет Противников или союзников, превращает проверки в Испытания.',
    en: 'Roughly half of all rolls should fail. The Narrator raises or lowers TNs to fit the Unit, adds Antagonists or allies, or turns rolls into Challenges.' }),
  E('xcard', 'basics', 57, { ru: 'Карта X', en: 'The X Card' }, {
    ru: 'Инструмент безопасности: лист с крупной X на столе. Любой может коснуться его без объяснений, и сцену меняют. Игра намеренно мрачная, поэтому такой инструмент рекомендуется всегда.',
    en: 'A safety tool: a sheet with a big X on the table. Anyone can tap it without explanation and the scene changes. The game is deliberately dark, so a safety tool is always recommended.' }),

  // ---- Character creation ----
  E('recruitment', 'creation', 24, { ru: 'Призыв: атрибуты', en: 'Recruitment: attributes' }, {
    ru: 'Распределите 10 очков между Телом, Разумом и Духом, минимум 1 в каждом.\nСредний человек — 3, предел человека — 6, больше 6 — сверхчеловеческое.\nАтрибут с 1 делает солдата очень уязвимым.',
    en: 'Divide 10 points among Brawn, Smarts and Guts, at least 1 each.\nAn average human is 3, the human peak is 6, above 6 is superhuman.\nStarting any attribute at 1 leaves you very vulnerable.' }),
  E('training', 'creation', 26, { ru: 'Обучение: навыки', en: 'Training: skills' }, {
    ru: 'Выберите три обученных навыка и распределите между ними три куба навыка: 3-0-0, 2-1-0 или 1-1-1. Обученный навык без кубов всё равно считается обученным.\nЕсли куб идёт в Шёпот, выберите Путь и один ритуал из него. Ритуалов в Пути столько же, сколько отметок.',
    en: 'Choose three trained skills and assign three Skill Dice among them: 3-0-0, 2-1-0 or 1-1-1. A trained skill with no dice still counts as trained.\nA die in Whisper means choosing a Path and one ritual from it. You know one ritual per point of training in each Path.' }),
  E('deployment', 'creation', 27, { ru: 'Отправка', en: 'Deployment' }, {
    ru: 'Возьмите три карты — стартовые душевные силы. Их можно сразу потратить на развитие или оставить на игру.',
    en: 'Draw three cards as your starting emotional resources. Spend them on growth right away or keep them for play.' }),
  E('officer-rule', 'creation', 27, { ru: 'Офицер в отряде', en: 'Ranking Officer' }, {
    ru: 'По желанию стола: в начале Миссии офицер может пройти проверку Скверны, взять 4 карты и раздать их отряду (с учётом лимита руки) или оставить себе.',
    en: 'Optional: at the start of a Mission a Ranking Officer may take a chance of Corruption, then draw 4 cards and share them with the Unit (respecting hand size) or keep them.' }),
  E('growth', 'creation', 27, { ru: 'Развитие персонажа', en: 'Character growth' }, {
    ru: 'В конце Миссии, после Наград, наборы карт тратятся на развитие:\n- Новый навык: любые карты, цена 1 + номер дополнительного навыка (первый — 2, второй — 3…).\n- Новая отметка навыка: любые карты, цена 1 + номер новой отметки (4-я отметка — 5 карт).\n- Ранг атрибута: только красные карты, цена 1 + новый ранг (Тело 6 — 7 карт).\n- Все карты одной масти: цена на 1 меньше — нужен полный набор, но одну карту оставьте себе.\n- Все карты — картинки или тузы: эффект +1.',
    en: 'At the end of a Mission, after Decorations, sets of cards buy growth:\n- New skill: any cards, cost 1 + the number of extra skills (first 2, second 3…).\n- New skill pip: any cards, cost 1 + the new pip (pip 4 costs 5).\n- Attribute rank: red cards only, cost 1 + the new rank (Brawn 6 costs 7).\n- All one suit: cost −1 — you need the full set but keep one card.\n- All face cards and/or aces: +1 effect.' }),

  // ---- Attributes & skills ----
  E('attributes', 'skills', 24, { ru: 'Атрибуты', en: 'Attributes' }, {
    ru: 'Тело — сила, гибкость, физическое здоровье. Разум — ум, знания, душевное здоровье. Дух — храбрость, воля, эмоциональное здоровье.\nКаждый атрибут одновременно:\n- Здоровье: урон снижает атрибут; на 0 солдат погибает.\n- Защита: СЛ для атак по этому атрибуту.\n- Манипуляции +One для навыков этого атрибута.\nЧем ниже атрибут, тем легче попасть и тем меньше манипуляций. Тратить манипуляции атрибут не уменьшает.',
    en: 'Brawn — strength, flexibility, physical health. Smarts — intelligence, knowledge, mental health. Guts — courage, willpower, emotional health.\nEach attribute is at once:\n- Health: damage lowers it; at 0 the soldier dies.\n- Defense: the TN for attacks against it.\n- +One manipulations for its skills.\nThe lower it is, the easier you are to hit and the fewer manipulations you have. Using manipulations does not lower it.' }),
  E('whisper-skill', 'skills', 14, { ru: 'Навык Шёпот', en: 'Whisper skill' }, {
    ru: 'Знание магии и оккультного; каждый Путь — отдельный навык со своим атрибутом и обучением. Временно купленный Шёпот даёт только знания (руны, эффекты, слабости тварей), но не силу.',
    en: 'Knowledge of magic and the occult; each Path is a separate skill with its own attribute and training. A temporarily bought Whisper gives only knowledge (runes, effects, creature weaknesses), never power.' }),

  // ---- Rolls ----
  E('plusone', 'rolls', 4, { ru: 'Манипуляции +One', en: '+One manipulations' }, {
    ru: 'За один бросок можно сделать столько манипуляций, каков текущий атрибут навыка.\nДо броска:\n- временно получить необученный навык (кубы покупаются отдельно);\n- добавить куб.\nПосле броска:\n- поднять грань куба на 1 (4 → 5);\n- перебросить любые кубы и оставить результат — один раз за бросок.\nКаждая сыгранная карта даёт ещё одну манипуляцию на выбор. Кубы докупаются только до броска.',
    en: 'You may make as many manipulations as the governing attribute’s current rank.\nBefore the roll:\n- temporarily gain an untrained skill (dice bought separately);\n- add a die.\nAfter the roll:\n- add a pip to a die (4 → 5);\n- reroll any dice and keep the result — once per roll.\nEach card spent adds one more manipulation of your choice. Dice can only be bought before the roll.' }),
  E('roll-examples', 'rolls', 4, { ru: 'Примеры бросков', en: 'Roll examples' }, {
    ru: '- Стрельба 2, Дух 3, нужно 4 успеха: докупить 2 куба (2 манипуляции), выпало 5-4-3-1; перебросить три куба (3-я манипуляция): 6-5-2 — всего 3 успеха, промах.\n- Общение не обучено, Разум 4, СЛ 2: купить навык и 2 куба, выпало 5-4, поднять 4 до 5 — успех.\n- Атлетика 2, но Тело ранено до 1: одна манипуляция, докупить куб — 4-1-1, больше ничего не сделать.',
    en: '- Ranged 2, Guts 3, need 4: buy 2 dice (2 manipulations), roll 5-4-3-1; reroll three (3rd): 6-5-2 — only 3 successes, miss.\n- Untrained Communication, Smarts 4, TN 2: buy the skill and 2 dice, roll 5-4, raise the 4 — success.\n- Athletics 2 but Brawn wounded to 1: one manipulation, buy a die — 4-1-1, nothing more to do.' }),

  // ---- Combat ----
  E('initiative', 'combat', 9, { ru: 'Инициатива', en: 'Initiative' }, {
    ru: '- Каждый может показать (не сбрасывая) карту; старшая побеждает, туз старший. При ничьей можно показать ещё карту.\n- Без карт — открыть карту из колоды; она не идёт в руку и сбрасывается.\n- У Противников напечатано своё значение Инициативы; групп Противников Рассказчик ставит одним местом.\n- Победитель решает, кто ходит первым; каждый сходивший выбирает следующего.\n- Последний в раунде выбирает, кто начнёт следующий раунд, но не себя.',
    en: '- Everyone may show (not discard) a card; highest wins, Ace high. Ties may show another card.\n- With no hand, reveal a card from the deck; it is discarded, not kept.\n- Antagonists have a printed Initiative value; the Narrator gives each group one place.\n- The winner chooses who acts first; each actor chooses who goes next.\n- The last to act in a round picks who starts the next round, but not themselves.' }),
  E('actions', 'combat', 9, { ru: 'Действие в бою', en: 'Actions in combat' }, {
    ru: 'В свой ход персонаж делает одно действие: атаку, проверку навыка или Шёпот. Двигаться можно до или после действия.',
    en: 'On their turn a character takes one action: an attack, a skill roll or a Whisper. They may move before or after.' }),
  E('defense', 'combat', 9, { ru: 'Защита', en: 'Defense' }, {
    ru: 'СЛ атаки равна текущему рангу атакуемого атрибута. По умолчанию атаки бьют по Телу; некоторые способности и Шёпоты — по Разуму или Духу.',
    en: 'An attack’s TN is the current rank of the targeted attribute. Attacks target Brawn by default; some abilities and Whispers target Smarts or Guts.' }),
  E('armor', 'combat', 9, { ru: 'Броня', en: 'Armor' }, {
    ru: 'У кого есть Броня, атака по Телу должна пробить большее из Тела и Брони. На атаки по Разуму и Духу Броня не влияет. «Броня» — это вообще «трудно попасть»: и бронированная тварь, и призрак могут иметь Броню 5.',
    en: 'With Armor, attacks against Brawn use the higher of Brawn and Armor. Attacks on Smarts or Guts ignore Armor. “Armor” simply means hard to hit: an armour-plated beast and a ghost can both have Armor 5.' }),
  E('weapon-successes', 'combat', 11, { ru: 'Лишние успехи', en: 'Extra successes' }, {
    ru: 'Успехи сверх нужных для попадания тратятся после броска на способности оружия; цена в скобках. Для Шёпота усиления планируются до броска.\nДля дополнительных целей («Очередь», гранаты, Шёпот) используется то же число успехов против их Защиты.',
    en: 'Successes beyond those needed to hit are spent after the roll on weapon abilities; the cost is in brackets. For Whispers, augments are planned before the roll.\nFor extra targets (Spray, grenades, Whispers) the same successes are compared to each target’s Defense.' }),
  E('mobs', 'combat', 62, { ru: 'Толпа Противников', en: 'Mobs' }, {
    ru: 'Противники типа «толпа» складывают успехи, как отряд в Испытании, но урон наносит одно оружие. Толпа действует на одной Инициативе, каждый член — раз за раунд. Бить их приходится по одному, Защита от толпы не растёт.',
    en: 'Mob Antagonists pool successes like a Challenge, but only one weapon deals damage. A mob acts on one Initiative, each member once per round. They are targeted individually; their Defense does not rise.' }),
  E('enemy-whispers', 'combat', 63, { ru: 'Шёпот у Противников', en: 'Antagonists with Whispers' }, {
    ru: 'Противники творят Шёпот по тем же правилам и платят уроном, но карт не сбрасывают — у Рассказчика нет руки.',
    en: 'Antagonists cast Whispers by the same rules and pay damage costs, but never discard cards — the Narrator has no hand.' }),
  E('vehicles', 'combat', 12, { ru: 'Транспорт', en: 'Vehicles' }, {
    ru: 'Водитель действует на Инициативе машины и использует её способности, модифицированные Телом машины; одна способность за ход. Атаки по машине — только по Телу, пассажиры урона не получают. Тело 0 — машина уничтожена.\n- Грузовик: Инициатива 8, Броня 5, Тело 7; таран 2 урона, пулемёт со вторым стрелком.\n- Танк: Инициатива 5, Броня 7, Тело 10; пушка 3 урона, пулемёты; на 0 Тела продолжает работать с бронёй, при новом уроне — карта: чёрная уничтожает.\n- Аэроплан: Инициатива Q, Броня 4, Тело 4; курсовые и хвостовой пулемёты.',
    en: 'The driver acts on the vehicle’s Initiative and uses its abilities, modified by its Brawn; one ability per turn. Attacks on a vehicle target Brawn only and occupants take no damage. At 0 Brawn it is destroyed.\n- Truck: Initiative 8, Armor 5, Brawn 7; ram 2 damage, mounted gun with a second operator.\n- Tank: Initiative 5, Armor 7, Brawn 10; cannon 3 damage, machine guns; at 0 Brawn keeps its Armor, and each further hit draws a card: black destroys it.\n- Airplane: Initiative Q, Armor 4, Brawn 4; forward and tail guns.' }),

  // ---- Damage ----
  E('damage', 'damage', 24, { ru: 'Урон', en: 'Damage' }, {
    ru: 'Урон снижает атакуемый атрибут. Если любой атрибут падает до 0, персонаж погибает. Лечение, если не сказано иное, можно направить в любой атрибут.',
    en: 'Damage lowers the targeted attribute. If any attribute reaches 0, the character dies. Unless stated otherwise, healing may go to any attribute.' }),
  E('healing', 'damage', 7, { ru: 'Лечение', en: 'Healing' }, {
    ru: '- В бою: каждая сожжённая карта поглощает 1 урон.\n- Вне боя: сжечь карту в любой момент — +1 к любому атрибуту (передышка, перевязка).\n- После Миссии все атрибуты восстанавливаются до ранга.\n- Целительные слова, Круг исцеления, Праздник.',
    en: '- In combat: each card burned negates 1 damage.\n- Out of combat: burn a card any time to heal 1 point of any attribute (a break, bandages).\n- After a Mission all attributes heal to their rank.\n- Healing Words, Healing Circle, Holiday.' }),
  E('death', 'damage', 66, { ru: 'Гибель', en: 'Death' }, {
    ru: 'На 0 в любом атрибуте солдат мёртв, ни медицина, ни магия не вернут его; тело может подняться как Непавший. Игрок создаёт нового персонажа по обычным правилам — обычно это солдат из отряда, который выходит вперёд в следующем раунде.',
    en: 'At 0 in any attribute the soldier is dead; no medicine or magic brings them back, and the body may rise as one of the Unfallen. The player makes a new character by the normal rules — usually a soldier of the Unit who steps forward next round.' }),

  // ---- Corruption ----
  E('corruption-draw', 'corruption', 8, { ru: 'Проверка Скверны', en: 'Drawing for Corruption' }, {
    ru: 'Возьмите верхнюю карту колоды и посмотрите тайно. Чёрная — +1 Скверна, красная — ничего. Карта передаётся Рассказчику.\nДжокер открывают, колоду перетасовывают и тянут снова.\nПоводы: эффекты Шёпота, способности Противников, Происшествия, чёрный джокер, 3-я, 4-я и 5-я отметка в Пути Шёпота.',
    en: 'Take the top card and look at it secretly. Black means +1 Corruption, red means none. Pass the card to the Narrator.\nA joker is revealed, the deck reshuffled, and you draw again.\nCauses: Whisper effects, Antagonist abilities, Incidents, the black joker, the 3rd, 4th and 5th pip in a Whisper Path.' }),
  E('corruption-levels', 'corruption', 8, { ru: 'Уровни Скверны', en: 'Corruption levels' }, {
    ru: 'Скверна — тайна от других игроков; Рассказчик ведёт свой учёт. Между Миссиями она не исчезает, снять её можно только особым событием.\n- 3: Рассказчик может добавить карту в Путешествие за этого игрока.\n- 4: до двух карт.\n- 5: последняя Миссия. В её конце солдат не возвращается — он ушёл к Иным.',
    en: 'Corruption is secret from other players; the Narrator keeps a record. It is not cleared between Missions; only special events remove it.\n- 3: the Narrator may add a card to the Journey for that player.\n- 4: up to two cards.\n- 5: the last Mission. At its end the soldier does not return — they have joined the Others.' }),
  E('corruption-play', 'corruption', 65, { ru: 'Отыгрыш Скверны', en: 'Playing Corruption' }, {
    ru: 'Как играть растущую Скверну, решает игрок: доказывать свою верность, искупать вину опасными заданиями или скатываться в эгоизм. Рассказчик может подталкивать описаниями и вопросами Путешествия.',
    en: 'How to play growing Corruption is the player’s choice: proving loyalty, atoning through danger, or sliding into selfishness. The Narrator may nudge through descriptions and Journey questions.' }),

  // ---- Magic ----
  E('whispers', 'magic', 14, { ru: 'Шёпот', en: 'Whispers' }, {
    ru: 'Сила существ из-за Завесы. Каждый с хотя бы одной отметкой в Шёпоте — заклинатель. Первая отметка: выбрать Путь и ритуал. Каждая новая — в текущий Путь или новый. Каждый Путь — отдельный навык.\nЗа 3-ю, 4-ю и 5-ю отметку в каждом Пути — проверка Скверны.',
    en: 'Power from beings beyond the Veil. Anyone with a point of Whisper training is a caster. First point: choose a Path and a ritual. Each new point goes into a current Path or a new one. Each Path is a separate skill.\nThe 3rd, 4th and 5th pip in each Path cost a Corruption draw.' }),
  E('casting', 'magic', 15, { ru: 'Как творить Шёпот', en: 'Casting a Whisper' }, {
    ru: '1. Выбрать ритуал и усиления — всё заранее.\n2. Заплатить цену Пути (карта или урон).\n3. Бросок.\n4. Дополнительные жертвы (только некоторые Пути).\n5. Если успехов хватило — эффект. Если нет — не происходит ничего.\nЦель — тот, на кого направлен Шёпот; её Защита — СЛ. При успехе цель становится жертвой.',
    en: '1. Choose the ritual and augments — all in advance.\n2. Pay the Path’s cost (a card or damage).\n3. Roll.\n4. Extra sacrifices (some Paths only).\n5. If you have enough successes, apply the effect. If not, nothing happens.\nThe target is who the Whisper is aimed at; its Defense is the TN. On success the target becomes a victim.' }),

  // ---- Gear ----
  E('weapons', 'gear', 11, { ru: 'Таблица оружия', en: 'Weapons table' }, {
    ru: '- Кулаки: 0 урона при Теле меньше 3, 1 при 3–7, 2 при больше 7; +1 урон (2).\n- Нож: 1; +1 урон (2).\n- Дубинка: 1; +1 урон (2), Оглушение (3).\n- Сабля/штык: 1; +1 урон (2), Натиск (3).\n- Топор/кирка: 1; +1 урон (2), Разрушение (3).\n- Посох: 1; +1 урон (2), Шквал (3).\n- Пистолет: 2; Критический (3).\n- Винтовка: 2; Критический (3), Прицел (1).\n- Пулемёт: 2; Критический (3), Очередь (2).\n- Граната: 1; +1 урон (1), Осколки (3).',
    en: '- Fists: 0 damage with Brawn under 3, 1 at 3–7, 2 above 7; +1 damage (2).\n- Knife: 1; +1 damage (2).\n- Club: 1; +1 damage (2), Stun (3).\n- Sword/Bayonet: 1; +1 damage (2), Assault (3).\n- Axe/Pick: 1; +1 damage (2), Wreck (3).\n- Staff: 1; +1 damage (2), Flurry (3).\n- Pistol: 2; Critical (3).\n- Rifle: 2; Critical (3), Aim (1).\n- Machine gun: 2; Critical (3), Spray (2).\n- Grenade: 1; +1 damage (1), Fragmentation (3).' }),
  E('equipment', 'gear', 11, { ru: 'Снаряжение', en: 'Equipment' }, {
    ru: 'Снаряжение учитывается условно: есть ружьё — есть и патроны. У каждого шанцевый инструмент, нож, котелок, паёк, одежда, противогаз и личные вещи. Досье Миссии может ограничить доступ к снаряжению.\nЧаще всего солдаты просили спички, носки, газеты и письма из дома.',
    en: 'Equipment is abstract: a gun comes with ammunition. Everyone has an entrenching tool, knife, mess kit, rations, clothes, a gas mask and personal effects. A Mission Folio may limit access.\nThe items soldiers asked for most: matches, socks, newspapers and letters from home.' }),

  // ---- Conditions ----
  E('cond-stunned', 'conditions', 11, { ru: 'Оглушение', en: 'Stunned' }, {
    ru: 'Все неоглушённые действуют в Инициативе раньше оглушённого. Дают дубинка (3) и Вода (3).',
    en: 'Everyone not stunned acts in Initiative before a stunned character. From a club (3) and Water (3).' }),
  E('cond-tn2', 'conditions', 17, { ru: '+2 к СЛ атак', en: '+2 TN on attacks' }, {
    ru: 'На следующее действие все атаки жертвы требуют на 2 успеха больше. Дают Странный ветер и Сбить с толку.',
    en: 'For their next action all the victim’s attacks need 2 more successes. From Strange Wind and Put Them Off.' }),
  E('cond-held', 'conditions', 21, { ru: 'Скован', en: 'Held fast' }, {
    ru: 'Жертва не может двигаться в своё действие, но может атаковать; с усилением — и атаковать не может. Даёт Сковать страхом.',
    en: 'The victim cannot move on its action but may attack; with the augment, it cannot attack either. From Hold Them Fast.' }),
  E('cond-flee', 'conditions', 21, { ru: 'Паника', en: 'Panicked' }, {
    ru: 'Жертва в ужасе отступает и покидает бой. Даёт Обратить в бегство.',
    en: 'The victim panics, retreats and leaves combat. From Make Them Flee.' }),
  E('cond-taunted', 'conditions', 22, { ru: 'Привлечён', en: 'Drawn' }, {
    ru: 'Следующим действием жертва может атаковать только заклинателя. Даёт Навлечь гнев.',
    en: 'On its next action the victim may only attack the caster. From Draw Their Ire.' }),
  E('cond-maintain', 'conditions', 17, { ru: 'Поддержание эффекта', en: 'Maintaining an effect' }, {
    ru: 'Некоторые Шёпоты держатся, пока заклинатель отказывается от своего действия, чтобы сосредоточиться, — обычно не дольше текущего значения атрибута Пути в раундах.',
    en: 'Some Whispers last while the caster gives up their action to concentrate — usually for up to the Path attribute’s current rank in rounds.' }),
  E('cond-blowback', 'conditions', 16, { ru: 'Отдача', en: 'Blowback' }, {
    ru: 'Если атака Гнилым фокусом промахнулась, нужно сразу пройти указанную проверку с той же СЛ, иначе эффект настигает заклинателя и союзников.',
    en: 'If a Rotten Trick attack misses, immediately pass the listed roll at the same TN or the effect hits the caster and allies.' }),
  E('cond-armor-mod', 'conditions', 11, { ru: 'Натиск и Разрушение', en: 'Assault and Wreck' }, {
    ru: '- Натиск: следующая атака по цели, чья угодно, игнорирует Броню.\n- Разрушение: Броня цели навсегда −1.',
    en: '- Assault: the next attack on the target, by anyone, ignores Armor.\n- Wreck: permanently reduce the target’s Armor by 1.' }),
  E('cond-dead', 'conditions', 66, { ru: 'Погиб · Ушёл к Иным', en: 'Dead · Joined the Others' }, {
    ru: '- Погиб: любой атрибут 0.\n- Ушёл к Иным: Скверна 5 в конце Миссии; солдат не возвращается с отрядом.',
    en: '- Dead: any attribute at 0.\n- Joined the Others: Corruption 5 at the end of a Mission; the soldier does not return with the Unit.' }),

  // ---- Antagonists ----
  E('antagonist-entries', 'antagonists', 69, { ru: 'Как читать Противников', en: 'Reading Antagonist entries' }, {
    ru: '- Тип: толпа (могут складывать успехи) или одиночка.\n- Инициатива: значение карты, будто Противник её вытянул.\n- Броня, Тело, Разум, Дух: как у персонажей; на 0 тварь уничтожена.\n- Оружие, навыки и способности, слабость.\n- Награда: сколько карт берёт тот, кто уничтожил; «отряду» — отряд решает, кому.',
    en: '- Type: mob (can pool successes) or solo.\n- Initiative: a card value, as if the Antagonist drew it.\n- Armor, Brawn, Smarts, Guts: as for characters; at 0 it is destroyed.\n- Weapons, skills and abilities, weakness.\n- Reward: cards drawn by whoever destroyed it; “for the Unit” means the Unit decides who.' }),

  // ---- Glossary ----
  E('glossary', 'glossary', undefined, { ru: 'Термины', en: 'Glossary' }, {
    ru: '- Brawn — Тело · Smarts — Разум · Guts — Дух\n- Skill Dice — кубы навыка · Training — обучение (отметки)\n- Target Number (TN) — Целевое число (СЛ)\n- +One — манипуляция\n- Challenge — Испытание\n- Corruption — Скверна\n- Whisper, Whisper Path — Шёпот, Путь Шёпота · Caster — заклинатель · Augment — усиление\n- The Others — Иные · The Veil — Завеса · No Man’s Land — Ничейная земля\n- Unit — отряд · Narrator — Рассказчик · Antagonist — Противник\n- Mission, Mission Folio — Миссия, досье Миссии · Incident — Происшествие · Decoration — Награда\n- Journey — Путешествие · Requirement — Условие\n- Mob / Solo — толпа / одиночка\n- Armor — Броня · Defense — Защита · Initiative — Инициатива',
    en: '- Brawn · Smarts · Guts — the three attributes\n- Skill Dice, Training — dice from training pips\n- Target Number (TN) — successes needed\n- +One — a manipulation\n- Challenge — a group roll\n- Corruption — loss of humanity to the Others\n- Whisper, Whisper Path, Caster, Augment — magic terms\n- The Others, the Veil, No Man’s Land — setting\n- Unit, Narrator, Antagonist\n- Mission, Mission Folio, Incident, Decoration\n- Journey, Requirement\n- Mob / Solo\n- Armor, Defense, Initiative' }),
]

const SKILL_TEXT: Record<string, L> = {
  athletics: { ru: 'Движение, скорость, ловкость, сила, выносливость и терпение к боли.', en: 'Movement, speed, grace, feats of strength, pain and endurance.' },
  melee: { ru: 'Удары, борьба, фехтование, драки — всё рукопашное оружие.', en: 'Kicks, punches, wrestling, sword fights and brawls — all hand-to-hand weapons.' },
  stealth: { ru: 'Скрытность во всех видах: тихо двигаться, прятаться, укрываться, маскироваться, ловкость рук.', en: 'Concealment of all kinds: moving quietly, hiding, cover, camouflage, palming objects.' },
  communication: { ru: 'Алфавиты, радио, язык тела, убеждение — и техническая, и душевная сторона общения.', en: 'Alphabets, radios, body language and persuasion — technical and emotional sides.' },
  knowledge: { ru: 'Всё, что можно выучить и запомнить: история, слухи, карты, птицы, первая помощь при шоке.', en: 'Anything studied and remembered: history, rumours, maps, birds, treating shock.' },
  mechanics: { ru: 'Собрать, починить, понять схему, сымпровизировать деталь и пользоваться любым устройством.', en: 'Building, repairing, reading diagrams, improvising parts and using any device.' },
  investigation: { ru: 'Обыскать комнату, разговорить местного, допросить пленного, прислушаться к интуиции.', en: 'Search a room, pump a local for information, make a prisoner talk, trust your intuition.' },
  ranged: { ru: 'Всё, что попадает туда, куда целишься: от плевка до артиллерии.', en: 'Everything that hits what it is pointed at, from spitballs to artillery.' },
  transport: { ru: 'Управление любой техникой: мотоцикл, грузовик, парусник.', en: 'Operating any vehicle: motorcycle, truck, sailboat.' },
}
const ATTR_L: Record<string, L> = { brawn: { ru: 'Тело', en: 'Brawn' }, smarts: { ru: 'Разум', en: 'Smarts' }, guts: { ru: 'Дух', en: 'Guts' } }

const ABILITY: Record<string, { t: L; b: L }> = {
  dmg: { t: { ru: '+1 урон', en: '+1 damage' }, b: { ru: 'Нанести на 1 урон больше.', en: 'Deal one more damage.' } },
  aim: { t: { ru: 'Прицел', en: 'Aim' }, b: { ru: 'Перебросить кубик урона от «Критического».', en: 'Reroll the damage die from Critical.' } },
  assault: { t: { ru: 'Натиск', en: 'Assault' }, b: { ru: 'Следующая атака по цели, чья угодно, игнорирует Броню.', en: 'The next attack on the target, by anyone, ignores Armor.' } },
  critical: { t: { ru: 'Критический', en: 'Critical' }, b: { ru: 'Вместо обычного урона бросить 1к6.', en: 'Roll 1d6 for damage instead.' } },
  flurry: { t: { ru: 'Шквал', en: 'Flurry' }, b: { ru: 'Сразу атаковать ещё раз ту же или другую цель.', en: 'Immediately attack again, same or another target.' } },
  fragmentation: { t: { ru: 'Осколки', en: 'Fragmentation' }, b: { ru: 'Урон по 1к6 целям.', en: 'Damage 1d6 targets.' } },
  spray: { t: { ru: 'Очередь', en: 'Spray' }, b: { ru: '+1 цель.', en: '+1 target.' } },
  stun: { t: { ru: 'Оглушение', en: 'Stun' }, b: { ru: 'Все неоглушённые действуют раньше оглушённого.', en: 'Everyone not stunned acts before the stunned character.' } },
  wreck: { t: { ru: 'Разрушение', en: 'Wreck' }, b: { ru: 'Навсегда снизить Броню цели на 1.', en: 'Permanently reduce the target’s Armor by 1.' } },
}

/** Ritual and path names come from the app's own strings, passed in so they follow the translation. */
export function buildEntries(name: (key: string, lang: 'ru' | 'en') => string): RefEntry[] {
  const out = [...BASE]
  for (const s of SKILLS) out.push(E(`skill-${s.key}`, 'skills', 26,
    { ru: `${name(s.key, 'ru')} (${ATTR_L[s.attr].ru})`, en: `${name(s.key, 'en')} (${ATTR_L[s.attr].en})` }, SKILL_TEXT[s.key]))
  for (const p of PATHS) {
    const pt = PATH_TEXT[p.key]
    const list = (lang: 'ru' | 'en') => p.rituals.map(r => `- ${name(r, lang)}`).join('\n')
    out.push(E(`path-${p.key}`, 'magic', pt.page,
      { ru: `${name(p.key, 'ru')} (${ATTR_L[p.attr].ru})`, en: `${name(p.key, 'en')} (${ATTR_L[p.attr].en})` },
      { ru: `${pt.text.ru}\n${list('ru')}`, en: `${pt.text.en}\n${list('en')}` }))
    for (const r of p.rituals) {
      const rt = RITUAL_TEXT[r]
      out.push(E(`ritual-${r}`, 'magic', rt.page,
        { ru: `${name(r, 'ru')} · ${name(p.key, 'ru')}`, en: `${name(r, 'en')} · ${name(p.key, 'en')}` }, rt.text))
    }
  }
  for (const [k, a] of Object.entries(ABILITY)) out.push(E(`ability-${k}`, 'gear', 11, a.t, a.b))
  const used = new Set(WEAPONS.flatMap(w => w.ab.map(([k]) => k)))
  void used
  for (const a of ANTAGONISTS) {
    const init = a.init > 10 ? ['J', 'Q', 'K', 'A'][a.init - 11] : String(a.init)
    const stats = (lang: 'ru' | 'en') => lang === 'ru'
      ? `${a.type === 'mob' ? 'Толпа' : 'Одиночка'} · Инициатива ${init} · Броня ${a.armor || 'нет'}\nТело ${a.brawn} · Разум ${a.smarts} · Дух ${a.guts}\nНаграда: ${a.reward.ru}`
      : `${a.type === 'mob' ? 'Mob' : 'Solo'} · Initiative ${init} · Armor ${a.armor || 'none'}\nBrawn ${a.brawn} · Smarts ${a.smarts} · Guts ${a.guts}\nReward: ${a.reward.en}`
    out.push(E(`foe-${a.key}`, 'antagonists', a.page, a.name, { ru: `${a.note.ru}\n${stats('ru')}`, en: `${a.note.en}\n${stats('en')}` }))
  }
  return out
}
