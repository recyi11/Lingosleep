import re
from pathlib import Path
from pykakasi import kakasi

# Curated candidate bank. These are standalone lexical items, not modifier+noun combinations.
# Format: topic|part of speech|English|Simplified Chinese|Japanese|Korean
RAW = r'''
food|noun|pepper|胡椒|胡椒|후추
food|noun|vinegar|醋|酢|식초
food|noun|cooking oil|食用油|油|식용유
food|noun|flour|面粉|小麦粉|밀가루
food|noun|noodles|面条|麺|면
food|noun|udon|乌冬面|うどん|우동
food|noun|somen|素面|そうめん|소면
food|noun|seaweed|海苔|海苔|김
food|noun|wakame|裙带菜|わかめ|미역
food|noun|mushroom|蘑菇|きのこ|버섯
food|noun|onion|洋葱|玉ねぎ|양파
food|noun|carrot|胡萝卜|にんじん|당근
food|noun|potato|土豆|じゃがいも|감자
food|noun|tomato|番茄|トマト|토마토
food|noun|cucumber|黄瓜|きゅうり|오이
food|noun|cabbage|卷心菜|キャベツ|양배추
food|noun|lettuce|生菜|レタス|양상추
food|noun|green onion|葱|ねぎ|파
food|noun|garlic|大蒜|にんにく|마늘
food|noun|ginger|姜|生姜|생강
food|noun|strawberry|草莓|いちご|딸기
food|noun|grape|葡萄|ぶどう|포도
food|noun|peach|桃子|桃|복숭아
food|noun|pear|梨|梨|배
food|noun|banana|香蕉|バナナ|바나나
food|noun|lemon|柠檬|レモン|레몬
food|noun|honey|蜂蜜|蜂蜜|꿀
food|noun|jam|果酱|ジャム|잼
food|noun|butter|黄油|バター|버터
food|noun|cheese|奶酪|チーズ|치즈
food|noun|yogurt|酸奶|ヨーグルト|요거트
food|noun|sausage|香肠|ソーセージ|소시지
food|noun|ham|火腿|ハム|햄
food|noun|chicken|鸡肉|鶏肉|닭고기
food|noun|pork|猪肉|豚肉|돼지고기
food|noun|beef|牛肉|牛肉|소고기
food|noun|shrimp|虾|海老|새우
food|noun|crab|螃蟹|蟹|게
food|noun|shellfish|贝类|貝|조개
food|noun|tableware|餐具|食器|식기
food|noun|chopsticks|筷子|箸|젓가락
food|noun|spoon|勺子|スプーン|숟가락
food|noun|fork|叉子|フォーク|포크
food|noun|knife|刀|ナイフ|나이프
food|noun|plate|盘子|皿|접시
food|noun|rice bowl|饭碗|茶碗|밥그릇
food|noun|cup|杯子|コップ|컵
food|noun|lunch box|便当|弁当|도시락
food|noun|side dish|配菜|おかず|반찬
food|noun|dessert|甜点|デザート|디저트
travel|noun|ticket gate|检票口|改札|개찰구
travel|noun|fare|票价|運賃|운임
travel|noun|route|路线|路線|노선
travel|noun|station staff|车站工作人员|駅員|역무원
travel|noun|timetable|时刻表|時刻表|시간표
travel|noun|boarding area|乘车处|乗り場|승차장
travel|noun|entrance|入口|入口|입구
travel|noun|exit|出口|出口|출구
travel|noun|stairs|楼梯|階段|계단
travel|noun|elevator|电梯|エレベーター|엘리베이터
travel|noun|escalator|自动扶梯|エスカレーター|에스컬레이터
travel|noun|map|地图|地図|지도
travel|noun|address|地址|住所|주소
travel|noun|intersection|十字路口|交差点|교차로
travel|noun|traffic light|红绿灯|信号|신호등
travel|noun|sidewalk|人行道|歩道|보도
travel|noun|bridge|桥|橋|다리
travel|noun|port|港口|港|항구
travel|noun|ship|船|船|배
travel|noun|bicycle|自行车|自転車|자전거
travel|noun|taxi|出租车|タクシー|택시
travel|noun|driver|司机|運転手|운전기사
travel|noun|reservation|预约|予約|예약
travel|noun|luggage|行李|荷物|짐
travel|noun|customs|海关|税関|세관
travel|noun|inspection|检查|検査|검사
travel|noun|arrival|到达|到着|도착
travel|noun|departure|出发|出発|출발
travel|noun|domestic flight|国内航班|国内線|국내선
travel|noun|international flight|国际航班|国際線|국제선
travel|noun|service counter|柜台|窓口|창구
travel|noun|one way|单程|片道|편도
travel|noun|round trip|往返|往復|왕복
travel|noun|seat|座位|座席|좌석
travel|noun|aisle|通道|通路|통로
travel|noun|window seat|靠窗座位|窓側|창가
travel|noun|information desk|问讯处|案内所|안내소
travel|noun|sightseeing|观光|観光|관광
travel|noun|Japanese inn|日式旅馆|旅館|료칸
travel|noun|lodging|住宿处|宿|숙소
travel|noun|reception|前台|受付|접수처
travel|noun|parking lot|停车场|駐車場|주차장
travel|noun|gasoline|汽油|ガソリン|휘발유
travel|noun|road|道路|道路|도로
travel|noun|highway|高速公路|高速道路|고속도로
travel|noun|bus stop|公交站|バス停|버스정류장
travel|noun|last stop|终点站|終点|종점
travel|noun|passenger|乘客|乗客|승객
travel|noun|traveler|旅行者|旅行者|여행자
travel|noun|destination|目的地|目的地|목적지
travel|noun|direction|方向|方向|방향
travel|noun|shortcut|近路|近道|지름길
travel|noun|crosswalk|人行横道|横断歩道|횡단보도
daily life|noun|key|钥匙|鍵|열쇠
daily life|noun|wallet|钱包|財布|지갑
daily life|noun|umbrella|雨伞|傘|우산
daily life|noun|watch|手表|腕時計|손목시계
daily life|noun|glasses|眼镜|眼鏡|안경
daily life|noun|bag|袋子|袋|봉투
daily life|noun|box|盒子|箱|상자
daily life|noun|bottle|瓶子|瓶|병
daily life|noun|can|罐|缶|캔
daily life|noun|paper|纸|紙|종이
daily life|noun|notebook|笔记本|ノート|공책
daily life|noun|pencil|铅笔|鉛筆|연필
daily life|noun|eraser|橡皮|消しゴム|지우개
daily life|noun|scissors|剪刀|はさみ|가위
daily life|noun|ruler|尺子|定規|자
daily life|noun|desk|书桌|机|책상
daily life|noun|chair|椅子|椅子|의자
daily life|noun|shelf|架子|棚|선반
daily life|noun|drawer|抽屉|引き出し|서랍
daily life|noun|refrigerator|冰箱|冷蔵庫|냉장고
daily life|noun|microwave|微波炉|電子レンジ|전자레인지
daily life|noun|rice cooker|电饭锅|炊飯器|밥솥
daily life|noun|vacuum cleaner|吸尘器|掃除機|청소기
daily life|noun|washing machine|洗衣机|洗濯機|세탁기
daily life|noun|fan|电风扇|扇風機|선풍기
daily life|noun|heater|暖气|暖房|난방
daily life|noun|air conditioning|空调|冷房|냉방
daily life|noun|kitchen|厨房|台所|부엌
daily life|noun|entryway|玄关|玄関|현관
daily life|noun|hallway|走廊|廊下|복도
daily life|noun|balcony|阳台|ベランダ|베란다
daily life|noun|roof|屋顶|屋根|지붕
daily life|noun|garden|院子|庭|마당
daily life|noun|trash can|垃圾桶|ごみ箱|쓰레기통
daily life|noun|detergent|洗涤剂|洗剤|세제
daily life|noun|soap|肥皂|石鹸|비누
daily life|noun|toothbrush|牙刷|歯ブラシ|칫솔
daily life|noun|toothpaste|牙膏|歯磨き粉|치약
daily life|noun|towel|毛巾|タオル|수건
daily life|noun|blanket|毛毯|毛布|담요
daily life|noun|pillow|枕头|枕|베개
daily life|noun|futon|被褥|布団|이불
daily life|noun|socks|袜子|靴下|양말
daily life|noun|hat|帽子|帽子|모자
daily life|noun|gloves|手套|手袋|장갑
daily life|noun|ring|戒指|指輪|반지
daily life|noun|necklace|项链|ネックレス|목걸이
daily life|noun|pocket|口袋|ポケット|주머니
daily life|noun|button|纽扣|ボタン|단추
daily life|noun|zipper|拉链|ファスナー|지퍼
daily life|noun|mirror|镜子|鏡|거울
daily life|noun|comb|梳子|くし|빗
daily life|noun|hair dryer|吹风机|ドライヤー|헤어드라이어
daily life|noun|shampoo|洗发水|シャンプー|샴푸
daily life|noun|tissue|纸巾|ティッシュ|휴지
daily life|noun|thermometer|体温计|体温計|체온계
daily life|noun|medicine|药|薬|약
daily life|noun|cold|感冒|風邪|감기
daily life|noun|cough|咳嗽|咳|기침
daily life|noun|fever|发烧|熱|열
daily life|noun|pain|疼痛|痛み|통증
daily life|noun|wound|伤口|傷|상처
daily life|noun|illness|疾病|病気|질병
daily life|noun|health|健康|健康|건강
daily life|noun|exercise|运动|運動|운동
daily life|noun|walk|散步|散歩|산책
daily life|noun|break|休息|休憩|휴식
daily life|noun|weekday|工作日|平日|평일
daily life|noun|weekend|周末|週末|주말
daily life|noun|evening|傍晚|夕方|저녁때
daily life|noun|weather|天气|天気|날씨
daily life|noun|snow|雪|雪|눈
daily life|noun|wind|风|風|바람
daily life|noun|cloud|云|雲|구름
daily life|noun|sunny weather|晴天|晴れ|맑음
daily life|noun|cloudy weather|阴天|曇り|흐림
daily life|noun|temperature|温度|温度|온도
daily life|noun|season|季节|季節|계절
daily life|noun|spring|春天|春|봄
daily life|noun|summer|夏天|夏|여름
daily life|noun|autumn|秋天|秋|가을
daily life|noun|winter|冬天|冬|겨울
daily life|noun|grass|草|草|풀
daily life|noun|river|河流|川|강
daily life|noun|sky|天空|空|하늘
daily life|noun|star|星星|星|별
daily life|noun|sun|太阳|太陽|태양
work|noun|schedule|日程|予定|일정
work|noun|contact|联络|連絡|연락
work|noun|reply|回复|返信|답장
work|noun|material|资料|資料|자료
work|noun|document|文件|書類|서류
work|noun|office|办公室|事務所|사무실
work|noun|leave|休假|休暇|휴가
work|noun|salary|工资|給料|월급
work|noun|customer|顾客|客|고객
work|noun|order|订单|注文|주문
work|noun|phone|电话|電話|전화
work|noun|email|电子邮件|メール|이메일
work|noun|computer|电脑|パソコン|컴퓨터
work|noun|screen|屏幕|画面|화면
work|noun|file|文件|ファイル|파일
work|noun|folder|文件夹|フォルダ|폴더
work|noun|printing|打印|印刷|인쇄
work|noun|copy|复印件|コピー|복사본
work|noun|signature|签名|署名|서명
work|noun|deadline|期限|期限|기한
work|noun|department|部门|部署|부서
work|noun|employee|员工|社員|사원
work|noun|interview|面试|面接|면접
work|noun|resume|简历|履歴書|이력서
work|noun|business card|名片|名刺|명함
work|noun|uniform|制服|制服|유니폼
work|noun|shift|班次|シフト|근무조
work|noun|attendance|出勤|出勤|출근
work|noun|clock-out|下班打卡|退勤|퇴근
work|noun|meeting room|会议室|会議室|회의실
work|noun|break room|休息室|休憩室|휴게실
work|noun|printer|打印机|プリンター|프린터
work|noun|calendar|日历|カレンダー|달력
work|noun|memo|便条|メモ|메모
work|noun|password|密码|パスワード|비밀번호
work|noun|account|账号|アカウント|계정
school|noun|textbook|教科书|教科書|교과서
school|noun|dictionary|词典|辞書|사전
school|noun|homework|作业|宿題|숙제
school|noun|exam|考试|試験|시험
school|noun|grade|成绩|成績|성적
school|noun|classroom|教室|教室|교실
school|noun|library|图书馆|図書館|도서관
school|noun|gymnasium|体育馆|体育館|체육관
school|noun|schoolyard|操场|校庭|운동장
school|noun|classmate|同班同学|同級生|반 친구
school|noun|senior student|前辈|先輩|선배
school|noun|junior student|后辈|後輩|후배
school|noun|school year|年级|学年|학년
school|noun|class|课程|授業|수업
school|noun|question|问题|質問|질문
school|noun|answer|答案|答え|답
school|noun|practice|练习|練習|연습
school|noun|review|复习|復習|복습
school|noun|preparation|预习|予習|예습
school|noun|assignment|课题|課題|과제
school|noun|composition|作文|作文|작문
school|noun|presentation|发表|発表|발표
school|noun|mathematics|数学|数学|수학
school|noun|science|理科|理科|과학
school|noun|history|历史|歴史|역사
school|noun|geography|地理|地理|지리
school|noun|music|音乐|音楽|음악
school|noun|art|美术|美術|미술
school|noun|physical education|体育|体育|체육
school|noun|study abroad|留学|留学|유학
school|noun|school club|社团活动|部活|동아리
school|noun|graduation|毕业|卒業|졸업
school|noun|admission|入学|入学|입학
school|noun|school rules|校规|校則|교칙
school|noun|blackboard|黑板|黒板|칠판
school|noun|chalk|粉笔|チョーク|분필
school|noun|locker|储物柜|ロッカー|사물함
school|noun|backpack|书包|リュック|책가방
anime/drama|noun|main character|主角|主人公|주인공
anime/drama|noun|heroine|女主角|ヒロイン|여주인공
anime/drama|noun|villain|反派|悪役|악역
anime/drama|noun|voice actor|声优|声優|성우
anime/drama|noun|manga|漫画|漫画|만화
anime/drama|noun|movie|电影|映画|영화
anime/drama|noun|drama|电视剧|ドラマ|드라마
anime/drama|noun|program|节目|番組|프로그램
anime/drama|noun|scene|场景|場面|장면
anime/drama|noun|line|台词|台詞|대사
anime/drama|noun|work|作品|作品|작품
anime/drama|noun|author|作者|作者|작가
anime/drama|noun|director|导演|監督|감독
anime/drama|noun|character|角色|キャラクター|캐릭터
anime/drama|noun|story|故事|物語|이야기
anime/drama|noun|ending|结局|結末|결말
anime/drama|noun|fan|粉丝|ファン|팬
anime/drama|noun|trailer|预告片|予告|예고편
anime/drama|noun|subtitles|字幕|字幕|자막
anime/drama|noun|episode|集|エピソード|에피소드
anime/drama|noun|series|系列|シリーズ|시리즈
common verbs|verb|to open|打开|開ける|열다
common verbs|verb|to close|关闭|閉める|닫다
common verbs|verb|to put|放置|置く|놓다
common verbs|verb|to take|拿取|取る|가져가다
common verbs|verb|to hold|拿着|持つ|들다
common verbs|verb|to put in|放入|入れる|넣다
common verbs|verb|to take out|拿出|出す|꺼내다
common verbs|verb|to use|使用|使う|사용하다
common verbs|verb|to make|制作|作る|만들다
common verbs|verb|to wash|清洗|洗う|씻다
common verbs|verb|to clean|打扫|掃除する|청소하다
common verbs|verb|to cook|做饭|料理する|요리하다
common verbs|verb|to wear|穿上衣|着る|입다
common verbs|verb|to take off|脱下|脱ぐ|벗다
common verbs|verb|to put on shoes|穿鞋|履く|신다
common verbs|verb|to get on|乘坐|乗る|타다
common verbs|verb|to get off|下车|降りる|내리다
common verbs|verb|to turn|转弯|曲がる|돌다
common verbs|verb|to cross|穿过|渡る|건너다
common verbs|verb|to stop|停下|止まる|멈추다
common verbs|verb|to move|移动|動く|움직이다
common verbs|verb|to hurry|赶快|急ぐ|서두르다
common verbs|verb|to be late|迟到|遅れる|늦다
common verbs|verb|to wait|等待|待つ|기다리다
common verbs|verb|to call|叫/呼叫|呼ぶ|부르다
common verbs|verb|to answer|回答|答える|대답하다
common verbs|verb|to listen|听|聞く|듣다
common verbs|verb|to speak|说话|話す|말하다
common verbs|verb|to read|阅读|読む|읽다
common verbs|verb|to write|书写|書く|쓰다
common verbs|verb|to show|展示|見せる|보여주다
common verbs|verb|to remember|记住|覚える|기억하다
common verbs|verb|to forget|忘记|忘れる|잊다
common verbs|verb|to teach|教|教える|가르치다
common verbs|verb|to learn|学习|習う|배우다
common verbs|verb|to practice|练习|練習する|연습하다
common verbs|verb|to begin|开始|始める|시작하다
common verbs|verb|to finish|结束|終わる|끝나다
common verbs|verb|to continue|继续|続ける|계속하다
common verbs|verb|to choose|选择|選ぶ|고르다
common verbs|verb|to decide|决定|決める|정하다
common verbs|verb|to change|改变|変える|바꾸다
common verbs|verb|to fix|修理|直す|고치다
common verbs|verb|to throw away|扔掉|捨てる|버리다
common verbs|verb|to pick up|捡起|拾う|줍다
common verbs|verb|to lend|借出|貸す|빌려주다
common verbs|verb|to borrow|借入|借りる|빌리다
common verbs|verb|to return|归还|返す|돌려주다
common verbs|verb|to send|发送|送る|보내다
common verbs|verb|to arrive|送达|届く|도착하다
common verbs|verb|to pay|付款|払う|지불하다
common verbs|verb|to sell|出售|売る|팔다
common verbs|verb|to work|工作|働く|일하다
common verbs|verb|to rest|休息|休む|쉬다
common verbs|verb|to sleep|睡觉|寝る|자다
common verbs|verb|to wake up|起床|起きる|일어나다
common verbs|verb|to walk|走路|歩く|걷다
common verbs|verb|to run|跑步|走る|달리다
common verbs|verb|to swim|游泳|泳ぐ|수영하다
common verbs|verb|to play|玩|遊ぶ|놀다
common verbs|verb|to sing|唱歌|歌う|노래하다
common verbs|verb|to laugh|笑|笑う|웃다
common verbs|verb|to cry|哭|泣く|울다
common verbs|verb|to think|想|思う|생각하다
common verbs|verb|to know|知道|知る|알다
common verbs|verb|to understand|明白|分かる|이해하다
common verbs|verb|to need|需要|要る|필요하다
common verbs|verb|to be troubled|为难|困る|곤란하다
common verbs|verb|to help|帮忙|手伝う|돕다
numbers|noun|half|一半|半分|절반
numbers|noun|total|全部|全部|전부
numbers|noun|first|最初|最初|처음
numbers|noun|last|最后|最後|마지막
numbers|noun|pair|一对|一対|한 쌍
numbers|noun|dozen|一打|ダース|다스
numbers|noun|amount|数量|数量|수량
numbers|noun|number|号码|番号|번호
numbers|noun|order|顺序|順番|순서
numbers|noun|count|次数|回数|횟수
'''

candidates = []
for line in RAW.strip().splitlines():
    parts = [p.strip() for p in line.split('|')]
    if len(parts) != 6:
        raise ValueError(f'Bad candidate row: {line}')
    candidates.append(parts)

source_files = [Path('src/vocabulary-basic.ts')]
# Include an existing expansion if this script is ever re-run.
if Path('src/vocabulary-basic-expansion.ts').exists():
    source_files.append(Path('src/vocabulary-basic-expansion.ts'))

existing = {'Japanese': set(), 'Korean': set()}
object_re = re.compile(r'targetLanguage:\s*"(Japanese|Korean)".*?targetText:\s*"([^"]+)".*?level:\s*"Basic"', re.S)
for path in source_files:
    text = path.read_text()
    for lang, target in object_re.findall(text):
        existing[lang].add(target)

selected = []
seen_ja = set()
seen_ko = set()
for topic, pos, en, zh, ja, ko in candidates:
    if ja in existing['Japanese'] or ko in existing['Korean']:
        continue
    if ja in seen_ja or ko in seen_ko:
        continue
    selected.append((topic, pos, en, zh, ja, ko))
    seen_ja.add(ja)
    seen_ko.add(ko)
    if len(selected) == 250:
        break

if len(selected) < 250:
    raise SystemExit(f'Only {len(selected)} unique Basic concepts remain after duplicate filtering; need 250')

conv = kakasi()
def reading_and_romaji(text: str):
    parts = conv.convert(text)
    reading = ''.join(p['hira'] for p in parts)
    romaji = ''.join(p['hepburn'] for p in parts)
    return reading, romaji

def q(value: str):
    return value.replace('\\', '\\\\').replace('"', '\\"')

lines = []
lines.append('import type { Topic, VocabItem } from "./vocabulary";')
lines.append('')
lines.append('// Curated Basic expansion: 250 standalone concepts x Japanese/Korean = 500 entries.')
lines.append('// Generated from a hand-curated candidate bank after removing target-text duplicates.')
lines.append('type BasicRow = [topic: Topic, pos: "noun" | "verb", en: string, zh: string, ja: string, jaReading: string, jaRomanization: string, ko: string];')
lines.append('')
lines.append('const rows: BasicRow[] = [')
for topic, pos, en, zh, ja, ko in selected:
    reading, romaji = reading_and_romaji(ja)
    lines.append(f'  ["{q(topic)}", "{q(pos)}", "{q(en)}", "{q(zh)}", "{q(ja)}", "{q(reading)}", "{q(romaji)}", "{q(ko)}"],')
lines.append('];')
lines.append('')
lines.append('export const basicCuratedExpansion: VocabItem[] = rows.flatMap(([topic, pos, en, zh, ja, jaReading, jaRomanization, ko], index) => {')
lines.append('  const suffix = String(index + 1).padStart(3, "0");')
lines.append('  return [')
lines.append('    { id: `ja-basic-curated-${suffix}`, targetLanguage: "Japanese", targetText: ja, meanings: { English: en, "Simplified Chinese": zh }, reading: jaReading, romanization: jaRomanization, level: "Basic", topic, exampleSentence: `「${ja}」を覚えます。`, exampleTranslations: { English: `I am learning the word “${en}”.`, "Simplified Chinese": `我在学习“${zh}”这个词。` } },')
lines.append('    { id: `ko-basic-curated-${suffix}`, targetLanguage: "Korean", targetText: ko, meanings: { English: en, "Simplified Chinese": zh }, reading: ko, romanization: "", level: "Basic", topic, exampleSentence: `“${ko}”라는 단어를 배워요.`, exampleTranslations: { English: `I am learning the word “${en}”.`, "Simplified Chinese": `我在学习“${zh}”这个词。` } },')
lines.append('  ];')
lines.append('});')
lines.append('')

out = Path('src/vocabulary-basic-expansion.ts')
out.write_text('\n'.join(lines))
print(f'Generated {len(selected)} concepts / {len(selected) * 2} Basic entries from {len(candidates)} curated candidates.')
print('Topic counts:')
from collections import Counter
for topic, count in sorted(Counter(row[0] for row in selected).items()):
    print(f'  {topic}: {count}')
