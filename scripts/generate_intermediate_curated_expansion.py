import json
import re
from collections import Counter, defaultdict
from pathlib import Path
from pykakasi import kakasi

# Standalone Intermediate lexical items only. No modifier+noun product generation.
# Format: topic|pos|English|Simplified Chinese|Japanese|Korean
RAW = r'''
work|noun|policy|方针|方針|방침
work|noun|procedure|流程|手順|절차
work|noun|responsibility|职责|担当|담당
work|noun|department|部门|部署|부서
work|noun|duty|勤務|勤務|근무
work|noun|attendance|出勤|出勤|출근
work|noun|leaving work|下班|退勤|퇴근
work|noun|overtime|加班|残業|야근
work|noun|leave|休假|休暇|휴가
work|noun|application|申请|申請|신청
work|noun|approval|批准|承認|승인
work|noun|rejection|驳回|却下|반려
work|noun|report|报告|報告|보고
work|noun|contact|联系|連絡|연락
work|noun|consultation|商量|相談|상담
work|noun|request|委托|依頼|의뢰
work|noun|confirmation|确认|確認|확인
work|noun|sharing|共享|共有|공유
work|noun|submission|提交|提出|제출
work|noun|deadline|期限|期限|기한
work|noun|contract|合同|契約|계약
work|noun|renewal|更新|更新|갱신
work|noun|recruitment|招聘|採用|채용
work|noun|application for a job|应聘|応募|지원
work|noun|interview|面试|面接|면접
work|noun|training|培训|研修|연수
work|noun|evaluation|评价|評価|평가
work|noun|achievement|成果|成果|성과
work|noun|goal|目标|目標|목표
work|noun|issue|课题|課題|과제
work|noun|improvement|改善|改善|개선
work|noun|quality|质量|品質|품질
work|noun|efficiency|效率|効率|효율
work|noun|cost|成本|費用|비용
work|noun|billing|请款|請求|청구
work|noun|payment|付款|支払|지불
work|noun|deposit received|到账|入金|입금
work|noun|refund|退款|返金|환불
work|noun|customer|顾客|顧客|고객
work|noun|user|用户|利用者|이용자
work|noun|administrator|管理员|管理者|관리자
work|noun|person responsible|负责人|責任者|책임자
work|noun|meeting|会议|会議|회의
work|noun|material|资料|資料|자료
work|noun|document|文件|書類|서류
work|noun|notice|通知|通知|통지
work|noun|rule|规则|規則|규칙
work|noun|system|制度|制度|제도
work|noun|authority|权限|権限|권한
work|noun|configuration|设置|設定|설정
work|noun|incident|故障|障害|장애
work|noun|recovery|恢复|復旧|복구
work|noun|monitoring|监控|監視|감시
work|noun|warning|警告|警告|경고
work|noun|shift|班次|勤務帯|근무조
work|noun|workload|工作量|業務量|업무량
work|noun|priority|优先级|優先度|우선순위
work|noun|schedule|日程|日程|일정
work|noun|progress|进度|進捗|진척
work|noun|status|状态|状態|상태
work|noun|result|结果|結果|결과
work|noun|cause|原因|原因|원인
work|noun|impact|影响|影響|영향
work|noun|risk|风险|リスク|위험요소
work|noun|countermeasure|对策|対策|대책
work|noun|proposal|提案|提案|제안
work|noun|agreement|协议|合意|합의
work|noun|negotiation|谈判|交渉|협상
work|noun|client|客户|依頼主|의뢰인
work|noun|vendor|供应商|業者|업체

travel|noun|airline ticket|机票|航空券|항공권
travel|noun|flight operation|航班运行|運航|운항
travel|noun|connection|转机|乗継|환승
travel|noun|transit|过境|経由|경유
travel|noun|boarding|登机|搭乗|탑승
travel|noun|customs|海关|税関|세관
travel|noun|declaration|申报|申告|신고
travel|noun|duty free|免税|免税|면세
travel|noun|entry|入境|入国|입국
travel|noun|departure from country|出境|出国|출국
travel|noun|stay|停留|滞在|체류
travel|noun|lodging|住宿|宿泊|숙박
travel|noun|itinerary|行程|旅程|여정
travel|noun|sightseeing|观光|観光|관광
travel|noun|information|指引|案内|안내
travel|noun|counter|窗口|窓口|창구
travel|noun|origin|出发地|出発地|출발지
travel|noun|destination|目的地|目的地|목적지
travel|noun|airline|航空公司|航空会社|항공사
travel|noun|passenger|旅客|旅客|여객
travel|noun|crew|乘务员|乗員|승무원
travel|noun|cabin|客舱|機内|기내
travel|noun|border|国境|国境|국경
travel|noun|consulate|领事馆|領事館|영사관
travel|noun|embassy|大使馆|大使館|대사관
travel|noun|currency exchange|换汇|両替|환전
travel|noun|local currency|当地货币|現地通貨|현지통화
travel|noun|cash|现金|現金|현금
travel|noun|fare|费用|料金|요금
travel|noun|boarding area|乘车区|乗場|승차장
travel|noun|ride|乘车|乗車|승차
travel|noun|get off|下车|下車|하차
travel|noun|departure|发车|発車|발차
travel|noun|arrival|到达|到着|도착
travel|noun|route|路线|経路|경로
travel|noun|detour|绕行|迂回|우회
travel|noun|traffic jam|堵车|渋滞|정체
travel|noun|accident|事故|事故|사고
travel|noun|travel insurance|旅行保险|旅行保険|여행보험
travel|noun|reservation number|预约号|予約番号|예약번호
travel|noun|baggage claim|行李提取|手荷物受取|수하물수취
travel|noun|inspection|检查|検査|검사
travel|noun|screening|安检|保安検査|보안검색
travel|noun|delay|延误|遅れ|지체
travel|noun|cancellation|取消|取消|취소
travel|noun|platform|站台|ホーム|승강장
travel|noun|timetable|时刻表|時刻表|시간표
travel|noun|ticket gate|检票口|改札|개찰구
travel|noun|reception|前台|受付|접수처
travel|noun|vacancy|空房|空室|빈방
travel|noun|checkout|退房|退室|퇴실
travel|noun|guide|导游|案内人|안내원
travel|noun|souvenir|纪念品|土産|기념품
travel|noun|travelogue|游记|旅行記|여행기
travel|noun|departure lounge|候机室|待合室|대합실
travel|noun|transfer|换乘|乗換|갈아타기

food|noun|flavor|风味|風味|풍미
food|noun|aroma|香味|香り|향
food|noun|texture|口感|食感|식감
food|noun|ingredient|材料|材料|재료
food|noun|seasoning|调味料|調味料|조미료
food|noun|food ingredient|食材|食材|식재료
food|noun|order|点单|注文|주문
food|noun|bill|结账|会計|계산
food|noun|discount|折扣|割引|할인
food|noun|portion|分量|分量|양
food|noun|appetite|食欲|食欲|식욕
food|noun|sourness|酸味|酸味|신맛
food|noun|bitterness|苦味|苦味|쓴맛
food|noun|saltiness|咸味|塩味|짠맛
food|noun|fried food|油炸食品|揚物|튀김
food|noun|grilled food|烤物|焼物|구이
food|noun|simmered food|煮物|煮物|조림
food|noun|raw food|生食|生物|날것
food|noun|frozen food|冷冻食品|冷凍食品|냉동식품
food|noun|expiration date|保质期|賞味期限|유통기한
food|noun|nutrition|营养|栄養|영양
food|noun|protein|蛋白质|蛋白質|단백질
food|noun|fat|脂肪|脂質|지방
food|noun|carbohydrate|碳水化合物|炭水化物|탄수화물
food|noun|calorie|卡路里|カロリー|칼로리
food|noun|allergy|过敏|アレルギー|알레르기
food|noun|recipe|食谱|レシピ|조리법
food|noun|leftovers|剩菜|残り物|남은음식
food|noun|takeout|外带|持帰り|포장
food|noun|reservation|订位|予約|예약
food|noun|chef|厨师|料理人|요리사
food|noun|menu|菜单|献立|메뉴
food|noun|specialty|招牌菜|名物|특산물
food|noun|serving|份|一人前|일인분
food|adj|fresh|新鲜|新鮮|신선하다
food|adj|rich|浓郁|濃厚|진하다
food|adj|mild|清淡|薄味|담백하다
food|adj|greasy|油腻|脂っこい|느끼하다
food|adj|tasty|美味|美味しい|맛있다
food|adj|bland|淡|味気ない|싱겁다

daily life|noun|habit|习惯|習慣|습관
daily life|noun|plan|安排|予定|예정
daily life|noun|circumstance|情况|都合|사정
daily life|noun|errand|事情|用事|용무
daily life|noun|housework|家务|家事|집안일
daily life|noun|cleaning|打扫|掃除|청소
daily life|noun|laundry|洗衣|洗濯|세탁
daily life|noun|sleep|睡眠|睡眠|수면
daily life|noun|nap|午睡|昼寝|낮잠
daily life|noun|alarm|闹钟|目覚し|알람
daily life|noun|preparation|准备|支度|준비
daily life|noun|tidying|整理|片付け|정리
daily life|noun|shopping|购物|買物|장보기
daily life|noun|exercise|运动|運動|운동
daily life|noun|condition|身体状态|体調|컨디션
daily life|noun|fatigue|疲劳|疲労|피로
daily life|noun|lack of sleep|睡眠不足|寝不足|수면부족
daily life|noun|headache|头痛|頭痛|두통
daily life|noun|stomachache|腹痛|腹痛|복통
daily life|noun|pharmacy|药店|薬局|약국
daily life|noun|medical examination|诊察|診察|진찰
daily life|noun|treatment|治疗|治療|치료
daily life|noun|symptom|症状|症状|증상
daily life|noun|injury|受伤|怪我|부상
daily life|noun|insurance|保险|保険|보험
daily life|noun|coins|零钱|小銭|동전
daily life|noun|savings|存款|貯金|저축
daily life|noun|rent|房租|家賃|월세
daily life|noun|utilities|水电煤|光熱費|공과금
daily life|noun|water supply|自来水|水道|수도
daily life|noun|breakdown|故障|故障|고장
daily life|noun|repair|维修|修理|수리
daily life|noun|replacement|更换|交換|교환
daily life|noun|charging|充电|充電|충전
daily life|noun|communication|通信|通信|통신
daily life|noun|signal|信号|電波|전파
daily life|noun|photo|照片|写真|사진
daily life|noun|video|视频|動画|동영상
daily life|noun|recording|录音|録音|녹음
daily life|noun|screen|屏幕|画面|화면
daily life|noun|operation|操作|操作|조작
daily life|noun|function|功能|機能|기능
daily life|noun|search|搜索|検索|검색
daily life|noun|deletion|删除|削除|삭제
daily life|noun|storage|保存|保存|저장
daily life|noun|delivery|配送|配達|배송
daily life|noun|mail|邮政|郵便|우편
daily life|noun|envelope|信封|封筒|봉투
daily life|noun|neighborhood|附近|近所|근처
daily life|noun|noise|噪音|騒音|소음
daily life|noun|humidity|湿度|湿度|습도
daily life|noun|temperature|气温|気温|기온
daily life|noun|typhoon|台风|台風|태풍
daily life|noun|earthquake|地震|地震|지진
daily life|noun|power outage|停电|停電|정전
daily life|noun|promise|约定|約束|약속
daily life|noun|hobby|兴趣|趣味|취미
daily life|noun|mood|心情|気分|기분
daily life|noun|worry|烦恼|悩み|고민
daily life|noun|anxiety|担心|心配|걱정
daily life|noun|relief|安心|安心|안심
daily life|noun|tension|紧张|緊張|긴장
daily life|noun|expectation|期待|期待|기대
daily life|noun|disappointment|失望|失望|실망
daily life|noun|relationship|关系|人間関係|인간관계
daily life|noun|conversation|对话|会話|대화
daily life|noun|invitation|邀请|招待|초대
daily life|noun|event|活动|行事|행사
daily life|noun|memory|回忆|思い出|추억
daily life|noun|experience|经历|経験|경험
daily life|noun|choice|选择|選択|선택
daily life|noun|reason|理由|理由|이유
daily life|noun|chance|机会|機会|기회
daily life|adj|comfortable|舒适|快適|쾌적하다
daily life|adj|inconvenient|不方便|不便|불편하다
daily life|adj|complicated|复杂|複雑|복잡하다
daily life|adj|simple|简单|単純|단순하다
daily life|adj|safe|安全|安全|안전하다
daily life|adj|dangerous|危险|危険|위험하다
daily life|adj|natural|自然|自然|자연스럽다
daily life|adj|special|特别|特別|특별하다
daily life|adj|ordinary|普通|普通|평범하다
daily life|adj|necessary|必要|必要|필요하다

school|noun|class|课程|授業|수업
school|noun|lecture|讲座|講義|강의
school|noun|homework|作业|宿題|숙제
school|noun|exam|考试|試験|시험
school|noun|answer sheet|答卷|答案|답안
school|noun|grade|成绩|成績|성적
school|noun|credit|学分|単位|학점
school|noun|attendance|出席|出席|출석
school|noun|absence|缺席|欠席|결석
school|noun|lateness|迟到|遅刻|지각
school|noun|graduation|毕业|卒業|졸업
school|noun|admission|入学|入学|입학
school|noun|semester|学期|学期|학기
school|noun|tuition|学费|学費|등록금
school|noun|scholarship|奖学金|奨学金|장학금
school|noun|major|专业|専攻|전공
school|noun|department|学科|学科|학과
school|noun|professor|教授|教授|교수
school|noun|lecturer|讲师|講師|강사
school|noun|international student|留学生|留学生|유학생
school|noun|research|研究|研究|연구
school|noun|experiment|实验|実験|실험
school|noun|presentation|发表|発表|발표
school|noun|discussion|讨论|討論|토론
school|noun|question|问题|質問|질문
school|noun|answer|回答|回答|답변
school|noun|explanation|说明|説明|설명
school|noun|understanding|理解|理解|이해
school|noun|review|复习|復習|복습
school|noun|preparation|预习|予習|예습
school|noun|memorization|背诵|暗記|암기
school|noun|practice|练习|練習|연습
school|noun|composition|作文|作文|작문
school|noun|grammar|语法|文法|문법
school|noun|vocabulary|词汇|語彙|어휘
school|noun|pronunciation|发音|発音|발음
school|noun|dictionary|词典|辞書|사전
school|noun|grading|评分|採点|채점
school|noun|pass|合格|合格|합격
school|noun|failure|不合格|不合格|불합격
school|noun|qualification|资格|資格|자격
school|noun|thesis|论文|論文|논문
school|noun|topic|主题|テーマ|주제
school|noun|reference|参考资料|参考資料|참고자료
school|noun|citation|引用|引用|인용
school|noun|survey|调查|調査|설문
school|noun|data|数据|データ|데이터
school|noun|analysis|分析|分析|분석
school|noun|conclusion|结论|結論|결론
school|noun|outline|提纲|概要|개요
school|noun|example|例子|例|예시
school|noun|definition|定义|定義|정의
school|noun|expression|表达|表現|표현
school|noun|meaning|含义|意味|의미
school|noun|translation|翻译|翻訳|번역
school|noun|interpretation|口译|通訳|통역
school|noun|reading comprehension|阅读理解|読解|독해
school|noun|listening comprehension|听力|聴解|듣기
school|noun|writing|写作|記述|쓰기
school|noun|speaking|口语|会話力|말하기

anime/drama|noun|protagonist|主人公|主人公|주인공
anime/drama|noun|supporting role|配角|脇役|조연
anime/drama|noun|villain|反派|悪役|악역
anime/drama|noun|voice actor|声优|声優|성우
anime/drama|noun|actor|演员|俳優|배우
anime/drama|noun|actress|女演员|女優|여배우
anime/drama|noun|director|导演|監督|감독
anime/drama|noun|original work|原作|原作|원작
anime/drama|noun|sequel|续作|続編|속편
anime/drama|noun|final episode|大结局|最終回|최종회
anime/drama|noun|preview|预告|予告|예고
anime/drama|noun|scene|场景|場面|장면
anime/drama|noun|line|台词|台詞|대사
anime/drama|noun|acting|演技|演技|연기
anime/drama|noun|filming|拍摄|撮影|촬영
anime/drama|noun|editing|剪辑|編集|편집
anime/drama|noun|theme song|主题曲|主題歌|주제가
anime/drama|noun|subtitle|字幕|字幕|자막
anime/drama|noun|dubbing|配音|吹替|더빙
anime/drama|noun|streaming|配信|配信|스트리밍
anime/drama|noun|viewing|观看|視聴|시청
anime/drama|noun|rating|评分|評価|평점
anime/drama|noun|impression|感想|感想|감상
anime/drama|noun|popularity|人气|人気|인기
anime/drama|noun|topic|话题|話題|화제
anime/drama|noun|appearance|登场|登場|등장
anime/drama|noun|development|剧情发展|展開|전개
anime/drama|noun|ending|结局|結末|결말
anime/drama|noun|foreshadowing|伏笔|伏線|복선
anime/drama|noun|work|作品|作品|작품
anime/drama|noun|author|作者|作者|작가
anime/drama|noun|reader|读者|読者|독자
anime/drama|noun|audience|观众|観客|관객
anime/drama|noun|stage|舞台|舞台|무대
anime/drama|noun|visuals|影像|映像|영상
anime/drama|noun|manga|漫画|漫画|만화
anime/drama|noun|novel|小说|小説|소설
anime/drama|noun|episode|集数|話|회차
anime/drama|noun|season|季度|シーズン|시즌
anime/drama|noun|character|角色|登場人物|등장인물
anime/drama|noun|worldview|世界观|世界観|세계관
anime/drama|noun|plot|剧情|筋書|줄거리
anime/drama|noun|climax|高潮|山場|절정
anime/drama|noun|mystery|悬念|謎|미스터리
anime/drama|adj|moving|感人|感動的|감동적이다
anime/drama|adj|realistic|真实|現実的|현실적이다
anime/drama|adj|dramatic|戏剧性|劇的|극적이다
anime/drama|adj|memorable|难忘|印象的|인상적이다

common verbs|verb|to continue|继续|続ける|계속하다
common verbs|verb|to begin|开始|始める|시작하다
common verbs|verb|to finish|结束|終える|끝내다
common verbs|verb|to decide|决定|決める|정하다
common verbs|verb|to choose|选择|選ぶ|고르다
common verbs|verb|to compare|比较|比べる|비교하다
common verbs|verb|to change something|改变|変える|바꾸다
common verbs|verb|to change|变化|変わる|변하다
common verbs|verb|to increase|增加|増える|늘다
common verbs|verb|to increase something|增加某物|増やす|늘리다
common verbs|verb|to decrease|减少|減る|줄다
common verbs|verb|to reduce|减少某物|減らす|줄이다
common verbs|verb|to fix|修好|直す|고치다
common verbs|verb|to recover|痊愈|治る|낫다
common verbs|verb|to break|坏掉|壊れる|고장나다
common verbs|verb|to destroy|弄坏|壊す|부수다
common verbs|verb|to forget|忘记|忘れる|잊다
common verbs|verb|to remember|想起|思い出す|떠올리다
common verbs|verb|to notice|注意到|気づく|깨닫다
common verbs|verb|to think|思考|考える|생각하다
common verbs|verb|to investigate|调查|調べる|조사하다
common verbs|verb|to search|寻找|探す|찾다
common verbs|verb|to find|找到|見つける|발견하다
common verbs|verb|to lose|丢失|失う|잃다
common verbs|verb|to pick up|捡|拾う|줍다
common verbs|verb|to throw away|扔掉|捨てる|버리다
common verbs|verb|to carry|搬运|運ぶ|나르다
common verbs|verb|to send|发送|送る|보내다
common verbs|verb|to receive|收到|受取る|받다
common verbs|verb|to hand over|递交|渡す|건네다
common verbs|verb|to lend|借出|貸す|빌려주다
common verbs|verb|to borrow|借入|借りる|빌리다
common verbs|verb|to return something|归还|返す|돌려주다
common verbs|verb|to pay|支付|払う|지불하다
common verbs|verb|to save money|存钱|貯める|모으다
common verbs|verb|to apply|申请|申込む|신청하다
common verbs|verb|to refuse|拒绝|断る|거절하다
common verbs|verb|to request|请求|頼む|부탁하다
common verbs|verb|to invite|邀请|誘う|초대하다
common verbs|verb|to promise|约定|約束する|약속하다
common verbs|verb|to contact|联系|連絡する|연락하다
common verbs|verb|to consult|商量|相談する|상담하다
common verbs|verb|to explain|说明|説明する|설명하다
common verbs|verb|to confirm|确认|確認する|확인하다
common verbs|verb|to prepare|准备|準備する|준비하다
common verbs|verb|to organize|整理|片付ける|정리하다
common verbs|verb|to change clothes|换衣服|着替える|갈아입다
common verbs|verb|to wake someone|叫醒|起こす|깨우다
common verbs|verb|to sleep|入睡|眠る|잠들다
common verbs|verb|to wake up|醒来|目覚める|깨다
common verbs|verb|to be late|迟到|遅れる|늦다
common verbs|verb|to hurry|赶快|急ぐ|서두르다
common verbs|verb|to get lost|迷路|迷う|헤매다
common verbs|verb|to return|返回|戻る|돌아가다
common verbs|verb|to proceed|前进|進む|나아가다
common verbs|verb|to turn|转弯|曲がる|돌다
common verbs|verb|to cross|穿过|渡る|건너다
common verbs|verb|to ride|乘坐|乗る|타다
common verbs|verb|to stay overnight|住宿|泊まる|묵다
common verbs|verb|to visit|访问|訪ねる|방문하다
common verbs|verb|to guide|引导|案内する|안내하다
common verbs|verb|to participate|参加|参加する|참가하다
common verbs|verb|to pass an exam|合格|合格する|합격하다
common verbs|verb|to graduate|毕业|卒業する|졸업하다
common verbs|verb|to protect|保护|守る|지키다
common verbs|verb|to recognize|认可|認める|인정하다
common verbs|verb|to give up|放弃|諦める|포기하다
common verbs|verb|to improve|改善|改善する|개선하다
common verbs|verb|to solve|解决|解決する|해결하다
common verbs|verb|to prevent|防止|防ぐ|막다
common verbs|verb|to avoid|避免|避ける|피하다
common verbs|verb|to exchange|交换|交換する|교환하다
common verbs|verb|to save|保存|保存する|저장하다
common verbs|verb|to delete|删除|削除する|삭제하다
common verbs|verb|to update|更新|更新する|갱신하다
common verbs|verb|to check|检查|点検する|점검하다
common verbs|verb|to record|记录|記録する|기록하다
common verbs|verb|to share|共享|共有する|공유하다
common verbs|verb|to submit|提交|提出する|제출하다
common verbs|verb|to manage|管理|管理する|관리하다
common verbs|verb|to support|支持|支援する|지원하다
common verbs|verb|to handle|处理|対応する|대응하다
common verbs|verb|to occur|发生|発生する|발생하다
common verbs|verb|to recover|恢复|復旧する|복구하다

exam|noun|tendency|趋势|傾向|경향
exam|noun|cause|原因|原因|원인
exam|noun|result|结果|結果|결과
exam|noun|impact|影响|影響|영향
exam|noun|relationship|关系|関係|관계
exam|noun|situation|状况|状況|상황
exam|noun|condition|条件|条件|조건
exam|noun|purpose|目的|目的|목적
exam|noun|experience|经验|経験|경험
exam|noun|opinion|意见|意見|의견
exam|noun|problem|问题|問題|문제
exam|noun|solution|解决|解決|해결
exam|noun|change|变化|変化|변화
exam|noun|comparison|比较|比較|비교
exam|noun|selection|选择|選択|선택
exam|noun|possibility|可能性|可能性|가능성
exam|noun|society|社会|社会|사회
exam|noun|culture|文化|文化|문화
exam|noun|economy|经济|経済|경제
exam|noun|environment|环境|環境|환경
exam|noun|technology|技术|技術|기술
exam|noun|information|信息|情報|정보
exam|noun|transportation|交通|交通|교통
exam|noun|education|教育|教育|교육
exam|noun|history|历史|歴史|역사
exam|noun|region|地区|地域|지역
exam|noun|international affairs|国际|国際|국제
exam|noun|population|人口|人口|인구
exam|noun|generation|世代|世代|세대
exam|noun|law|法律|法律|법률
exam|noun|right|权利|権利|권리
exam|noun|duty|义务|義務|의무
exam|noun|responsibility|责任|責任|책임
exam|noun|freedom|自由|自由|자유
exam|noun|ability|能力|能力|능력
exam|noun|knowledge|知识|知識|지식
exam|noun|memory|记忆|記憶|기억
exam|noun|emotion|感情|感情|감정
exam|noun|attitude|态度|態度|태도
exam|noun|value|价值|価値|가치
exam|noun|effect|效果|効果|효과
exam|noun|feature|特征|特徴|특징
exam|noun|content|内容|内容|내용
exam|noun|degree|程度|程度|정도
exam|noun|range|范围|範囲|범위
exam|noun|ratio|比例|割合|비율
exam|noun|average|平均|平均|평균
exam|noun|part|部分|部分|부분
exam|noun|whole|整体|全体|전체
exam|noun|reality|现实|現実|현실
exam|noun|future|未来|未来|미래
exam|noun|past|过去|過去|과거
exam|noun|present|现在|現在|현재
exam|noun|standard|标准|基準|기준
exam|noun|level|水平|水準|수준
exam|noun|evidence|依据|根拠|근거
exam|noun|example|实例|事例|사례
exam|noun|point of view|观点|観点|관점
exam|noun|common point|共同点|共通点|공통점
exam|noun|difference|差异|相違|차이
exam|noun|background|背景|背景|배경
exam|noun|process|过程|過程|과정
exam|noun|structure|结构|構造|구조
exam|noun|role|作用|役割|역할
exam|noun|resource|资源|資源|자원
exam|noun|demand|需求|需要|수요
exam|noun|supply|供给|供給|공급
exam|adj|accurate|准确|正確|정확하다
exam|adj|clear|明确|明確|명확하다
exam|adj|appropriate|合适|適切|적절하다
exam|adj|sufficient|充分|十分|충분하다
exam|adj|insufficient|不足|不足|부족하다
exam|adj|important|重要|重要|중요하다
exam|adj|convenient|方便|便利|편리하다
exam|adj|effective|有效|有効|효과적이다
exam|adj|active|积极|積極的|적극적이다
exam|adj|passive|消极|消極的|소극적이다
exam|adj|objective|客观|客観的|객관적이다
exam|adj|subjective|主观|主観的|주관적이다
exam|adj|general|一般|一般的|일반적이다
exam|adj|concrete|具体|具体的|구체적이다
exam|adj|abstract|抽象|抽象的|추상적이다
exam|adj|various|多样|多様|다양하다
exam|adj|similar|相似|類似|유사하다
exam|adj|independent|独立|独立|독립적이다
exam|adj|stable|稳定|安定|안정적이다
exam|adj|temporary|暂时|一時的|일시적이다
'''

QUOTAS = {
    'work': 40,
    'travel': 30,
    'food': 15,
    'daily life': 45,
    'school': 30,
    'anime/drama': 20,
    'common verbs': 40,
    'exam': 30,
}

candidates = []
for line in RAW.strip().splitlines():
    parts = [p.strip() for p in line.split('|')]
    if len(parts) != 6:
        raise ValueError(f'Bad candidate row: {line}')
    topic, pos, en, zh, ja, ko = parts
    if pos not in {'noun', 'verb', 'adj'}:
        raise ValueError(f'Bad part of speech: {line}')
    if re.search(r'\s', ja) or re.search(r'\s', ko):
        raise ValueError(f'Phrase-like target contains whitespace: {line}')
    candidates.append(parts)

# Gather existing Japanese/Korean headwords from every vocabulary source currently on main.
existing = {'Japanese': set(), 'Korean': set()}
for path in Path('src').glob('vocabulary*.ts'):
    text = path.read_text()
    # Explicit VocabItem objects (single or multi-line).
    for lang, target in re.findall(r'targetLanguage:\s*"(Japanese|Korean)"[\s\S]{0,500}?targetText:\s*"([^"]+)"', text):
        existing[lang].add(target)
    # Compact pair-row formats used by the curated noun/basic expansions.
    for raw_inner in re.findall(r'^\s*\[(".*")\],\s*$', text, re.M):
        try:
            row = json.loads('[' + raw_inner + ']')
        except Exception:
            continue
        if len(row) == 7 and isinstance(row[3], str) and isinstance(row[6], str):
            existing['Japanese'].add(row[3])
            existing['Korean'].add(row[6])
        elif len(row) == 8 and isinstance(row[4], str) and isinstance(row[7], str):
            existing['Japanese'].add(row[4])
            existing['Korean'].add(row[7])

by_topic = defaultdict(list)
for row in candidates:
    by_topic[row[0]].append(row)

selected = []
seen_ja = set()
seen_ko = set()
for topic, quota in QUOTAS.items():
    accepted = []
    for row in by_topic[topic]:
        _, pos, en, zh, ja, ko = row
        if ja in existing['Japanese'] or ko in existing['Korean']:
            continue
        if ja in seen_ja or ko in seen_ko:
            continue
        accepted.append(row)
        seen_ja.add(ja)
        seen_ko.add(ko)
        if len(accepted) == quota:
            break
    if len(accepted) != quota:
        raise SystemExit(f'{topic}: only {len(accepted)} fresh concepts available, need {quota}')
    selected.extend(accepted)

assert len(selected) == 250
conv = kakasi()

def reading_and_romaji(text: str):
    parts = conv.convert(text)
    return ''.join(p['hira'] for p in parts), ''.join(p['hepburn'] for p in parts)

def q(value: str):
    return value.replace('\\', '\\\\').replace('"', '\\"')

lines = [
    'import type { Topic, VocabItem } from "./vocabulary";',
    '',
    '// Curated Intermediate expansion: 250 standalone concepts x Japanese/Korean = 500 entries.',
    '// Globally de-duplicated against the current vocabulary; no modifier+noun combinatorial filler.',
    'type SourceTopic = Topic | "exam";',
    'type Pos = "noun" | "verb" | "adj";',
    'type IntermediateRow = [topic: SourceTopic, pos: Pos, en: string, zh: string, ja: string, jaReading: string, jaRomanization: string, ko: string];',
    '',
    'const rows: IntermediateRow[] = [',
]
for topic, pos, en, zh, ja, ko in selected:
    reading, romaji = reading_and_romaji(ja)
    lines.append(f'  ["{q(topic)}", "{q(pos)}", "{q(en)}", "{q(zh)}", "{q(ja)}", "{q(reading)}", "{q(romaji)}", "{q(ko)}"],')
lines += [
    '];',
    '',
    'function examples(pos: Pos, topic: SourceTopic, ja: string, ko: string, en: string, zh: string) {',
    '  if (pos === "verb") return { ja: `「${ja}」という動詞を自然に使えるように練習します。`, ko: `“${ko}”라는 동사를 자연스럽게 쓰는 연습을 해요.`, en: `I practice using the verb “${en}” naturally.`, zh: `我练习自然地使用“${zh}”这个动词。` };',
    '  if (pos === "adj") return { ja: `「${ja}」という表現を例文で確認します。`, ko: `“${ko}”라는 표현을 예문으로 확인해요.`, en: `I review the expression “${en}” in an example sentence.`, zh: `我通过例句复习“${zh}”这个表达。` };',
    '  if (topic === "work") return { ja: `${ja}について担当者に確認しました。`, ko: `${ko} 관련 내용을 담당자에게 확인했어요.`, en: `I checked the details about ${en} with the person in charge.`, zh: `我向负责人确认了“${zh}”相关内容。` };',
    '  if (topic === "travel") return { ja: `${ja}について事前に確認しました。`, ko: `${ko} 관련 내용을 미리 확인했어요.`, en: `I checked ${en} in advance.`, zh: `我提前确认了“${zh}”相关信息。` };',
    '  if (topic === "school") return { ja: `${ja}について授業で学びました。`, ko: `${ko} 관련 내용을 수업에서 배웠어요.`, en: `I learned about ${en} in class.`, zh: `我在课上学习了“${zh}”。` };',
    '  if (topic === "anime/drama") return { ja: `${ja}が特に印象に残りました。`, ko: `${ko} 부분이 특히 인상적이었어요.`, en: `The ${en} was especially memorable.`, zh: `“${zh}”这一点尤其令人印象深刻。` };',
    '  if (topic === "food") return { ja: `${ja}について店員に聞きました。`, ko: `${ko} 관련 내용을 직원에게 물어봤어요.`, en: `I asked the staff about ${en}.`, zh: `我向店员询问了“${zh}”。` };',
    '  if (topic === "exam") return { ja: `${ja}の意味と使い方を確認します。`, ko: `${ko}의 뜻과 쓰임을 확인해요.`, en: `I review the meaning and usage of ${en}.`, zh: `我复习“${zh}”的含义和用法。` };',
    '  return { ja: `${ja}について詳しく調べました。`, ko: `${ko}에 대해 자세히 알아봤어요.`, en: `I looked into ${en} in more detail.`, zh: `我进一步了解了“${zh}”。` };',
    '}',
    '',
    'export const intermediateCuratedExpansion: VocabItem[] = rows.flatMap(([sourceTopic, pos, en, zh, ja, jaReading, jaRomanization, ko], index) => {',
    '  const suffix = String(index + 1).padStart(3, "0");',
    '  const jaTopic: Topic = sourceTopic === "exam" ? "JLPT" : sourceTopic;',
    '  const koTopic: Topic = sourceTopic === "exam" ? "TOPIK" : sourceTopic;',
    '  const ex = examples(pos, sourceTopic, ja, ko, en, zh);',
    '  return [',
    '    { id: `ja-intermediate-curated-${suffix}`, targetLanguage: "Japanese", targetText: ja, meanings: { English: en, "Simplified Chinese": zh }, reading: jaReading, romanization: jaRomanization, level: "Intermediate", topic: jaTopic, exampleSentence: ex.ja, exampleTranslations: { English: ex.en, "Simplified Chinese": ex.zh } },',
    '    { id: `ko-intermediate-curated-${suffix}`, targetLanguage: "Korean", targetText: ko, meanings: { English: en, "Simplified Chinese": zh }, reading: ko, romanization: "", level: "Intermediate", topic: koTopic, exampleSentence: ex.ko, exampleTranslations: { English: ex.en, "Simplified Chinese": ex.zh } },',
    '  ];',
    '});',
    '',
]
Path('src/vocabulary-intermediate-curated-expansion.ts').write_text('\n'.join(lines))
print('Generated 250 concepts / 500 Intermediate entries.')
print('Topic counts:', dict(Counter(row[0] for row in selected)))
print('POS counts:', dict(Counter(row[1] for row in selected)))
