export type TargetLanguage = "Japanese" | "Korean";
export type NativeLanguage = "English" | "Simplified Chinese" | "Traditional Chinese";
export type Level = "Basic" | "Intermediate" | "Advanced";
export type Topic = "food" | "travel" | "daily life" | "numbers" | "common verbs" | "work" | "school" | "anime/drama" | "JLPT" | "TOPIK";
export type Status = "New" | "Learning" | "Familiar" | "Mastered";

export type Word = {
  id: string;
  lang: TargetLanguage;
  text: string;
  meanings: Record<NativeLanguage, string>;
  reading: string;
  romanization: string;
  level: Level;
  topic: Topic;
  example: string;
  translations: Record<NativeLanguage, string>;
  status?: Status;
  favorite?: boolean;
  timesPlayed?: number;
  lastPlayed?: string;
};

type VocabularyDictionary = Record<TargetLanguage, Record<Level, Word[]>>;

export const vocabularyDictionary: VocabularyDictionary = {
  Japanese: {
    Basic: [
      word("ja-food-basic-1", "Japanese", "ご飯", "meal; cooked rice", "米饭；餐", "米飯；餐", "ごはん", "gohan", "Basic", "food", "朝ご飯を食べます。", "I eat breakfast.", "我吃早饭。", "我吃早飯。"),
      word("ja-food-basic-2", "Japanese", "水", "water", "水", "水", "みず", "mizu", "Basic", "food", "水をください。", "Water, please.", "请给我水。", "請給我水。"),
      word("ja-food-basic-3", "Japanese", "パン", "bread", "面包", "麵包", "パン", "pan", "Basic", "food", "パンを食べます。", "I eat bread.", "我吃面包。", "我吃麵包。"),
      word("ja-food-basic-4", "Japanese", "お茶", "tea", "茶", "茶", "おちゃ", "ocha", "Basic", "food", "お茶を飲みます。", "I drink tea.", "我喝茶。", "我喝茶。"),
      word("ja-travel-basic-1", "Japanese", "駅", "station", "车站", "車站", "えき", "eki", "Basic", "travel", "駅はどこですか。", "Where is the station?", "车站在哪里？", "車站在哪裡？"),
      word("ja-travel-basic-2", "Japanese", "空港", "airport", "机场", "機場", "くうこう", "kuko", "Basic", "travel", "空港へ行きます。", "I go to the airport.", "我去机场。", "我去機場。"),
      word("ja-travel-basic-3", "Japanese", "電車", "train", "电车", "電車", "でんしゃ", "densha", "Basic", "travel", "電車に乗ります。", "I ride the train.", "我坐电车。", "我坐電車。"),
      word("ja-travel-basic-4", "Japanese", "ホテル", "hotel", "酒店", "飯店", "ホテル", "hoteru", "Basic", "travel", "ホテルは近いです。", "The hotel is nearby.", "酒店很近。", "飯店很近。"),
      word("ja-life-basic-1", "Japanese", "寝る", "to sleep", "睡觉", "睡覺", "ねる", "neru", "Basic", "daily life", "十一時に寝ます。", "I go to sleep at eleven.", "我十一点睡觉。", "我十一點睡覺。"),
      word("ja-life-basic-2", "Japanese", "起きる", "to wake up", "起床", "起床", "おきる", "okiru", "Basic", "daily life", "七時に起きます。", "I wake up at seven.", "我七点起床。", "我七點起床。"),
      word("ja-life-basic-3", "Japanese", "飲む", "to drink", "喝", "喝", "のむ", "nomu", "Basic", "daily life", "水を飲みます。", "I drink water.", "我喝水。", "我喝水。"),
      word("ja-life-basic-4", "Japanese", "帰る", "to go home", "回家", "回家", "かえる", "kaeru", "Basic", "daily life", "家に帰ります。", "I go home.", "我回家。", "我回家。"),
      word("ja-numbers-basic-1", "Japanese", "七", "seven", "七", "七", "なな / しち", "nana / shichi", "Basic", "numbers", "七つください。", "Seven, please.", "请给我七个。", "請給我七個。"),
      word("ja-numbers-basic-2", "Japanese", "一", "one", "一", "一", "いち", "ichi", "Basic", "numbers", "一つください。", "One, please.", "请给我一个。", "請給我一個。"),
      word("ja-numbers-basic-3", "Japanese", "三", "three", "三", "三", "さん", "san", "Basic", "numbers", "三人です。", "There are three people.", "有三个人。", "有三個人。"),
      word("ja-numbers-basic-4", "Japanese", "十", "ten", "十", "十", "じゅう", "ju", "Basic", "numbers", "十円です。", "It is ten yen.", "是十日元。", "是十日圓。"),
      word("ja-verbs-basic-1", "Japanese", "見る", "to see; to watch", "看", "看", "みる", "miru", "Basic", "common verbs", "映画を見ます。", "I watch a movie.", "我看电影。", "我看電影。"),
      word("ja-verbs-basic-2", "Japanese", "行く", "to go", "去", "去", "いく", "iku", "Basic", "common verbs", "学校へ行きます。", "I go to school.", "我去学校。", "我去學校。"),
      word("ja-verbs-basic-3", "Japanese", "食べる", "to eat", "吃", "吃", "たべる", "taberu", "Basic", "common verbs", "りんごを食べます。", "I eat an apple.", "我吃苹果。", "我吃蘋果。"),
      word("ja-verbs-basic-4", "Japanese", "聞く", "to listen; to ask", "听；问", "聽；問", "きく", "kiku", "Basic", "common verbs", "音楽を聞きます。", "I listen to music.", "我听音乐。", "我聽音樂。"),
    ],
    Intermediate: [
      word("ja-work-intermediate-1", "Japanese", "会議", "meeting; conference", "会议", "會議", "かいぎ", "kaigi", "Intermediate", "work", "午後に会議があります。", "There is a meeting in the afternoon.", "下午有会议。", "下午有會議。"),
      word("ja-work-intermediate-2", "Japanese", "締切", "deadline", "截止日期", "截止日期", "しめきり", "shimekiri", "Intermediate", "work", "締切は金曜日です。", "The deadline is Friday.", "截止日期是星期五。", "截止日期是星期五。"),
      word("ja-work-intermediate-3", "Japanese", "資料", "materials; documents", "资料", "資料", "しりょう", "shiryo", "Intermediate", "work", "資料を送ります。", "I send the materials.", "我发送资料。", "我寄送資料。"),
      word("ja-school-intermediate-1", "Japanese", "課題", "assignment; task", "课题；作业", "課題；作業", "かだい", "kadai", "Intermediate", "school", "課題を提出しました。", "I submitted the assignment.", "我提交了作业。", "我提交了作業。"),
      word("ja-school-intermediate-2", "Japanese", "授業", "class; lesson", "课程", "課程", "じゅぎょう", "jugyo", "Intermediate", "school", "授業は九時に始まります。", "Class starts at nine.", "课程九点开始。", "課程九點開始。"),
      word("ja-school-intermediate-3", "Japanese", "復習", "review", "复习", "複習", "ふくしゅう", "fukushu", "Intermediate", "school", "毎晩復習します。", "I review every night.", "我每晚复习。", "我每晚複習。"),
      word("ja-anime-intermediate-1", "Japanese", "主人公", "main character", "主角", "主角", "しゅじんこう", "shujinko", "Intermediate", "anime/drama", "主人公は勇敢です。", "The main character is brave.", "主角很勇敢。", "主角很勇敢。"),
      word("ja-anime-intermediate-2", "Japanese", "場面", "scene", "场景", "場景", "ばめん", "bamen", "Intermediate", "anime/drama", "この場面が好きです。", "I like this scene.", "我喜欢这个场景。", "我喜歡這個場景。"),
      word("ja-anime-intermediate-3", "Japanese", "最終回", "final episode", "最终集", "最終集", "さいしゅうかい", "saishukai", "Intermediate", "anime/drama", "最終回を見ました。", "I watched the final episode.", "我看了最终集。", "我看了最終集。"),
    ],
    Advanced: [
      word("ja-jlpt-advanced-1", "Japanese", "恐縮", "feeling obliged; humbled", "惶恐；不好意思", "惶恐；不好意思", "きょうしゅく", "kyoshuku", "Advanced", "JLPT", "お手数をおかけして恐縮です。", "I am sorry to trouble you.", "给您添麻烦，我很不好意思。", "給您添麻煩，我很不好意思。"),
      word("ja-jlpt-advanced-2", "Japanese", "躊躇", "hesitation", "犹豫", "猶豫", "ちゅうちょ", "chucho", "Advanced", "JLPT", "彼は返事に躊躇しました。", "He hesitated to answer.", "他犹豫着回答。", "他猶豫著回答。"),
      word("ja-jlpt-advanced-3", "Japanese", "著しい", "remarkable; significant", "显著的", "顯著的", "いちじるしい", "ichijirushii", "Advanced", "JLPT", "著しい変化がありました。", "There was a significant change.", "发生了显著变化。", "發生了顯著變化。"),
      word("ja-jlpt-advanced-4", "Japanese", "促す", "to urge; to prompt", "促使", "促使", "うながす", "unagasu", "Advanced", "JLPT", "先生は参加を促しました。", "The teacher encouraged participation.", "老师促使大家参加。", "老師促使大家參加。"),
    ],
  },
  Korean: {
    Basic: [
      word("ko-food-basic-1", "Korean", "밥", "rice; meal", "米饭；饭", "米飯；飯", "밥", "bap", "Basic", "food", "밥을 먹어요.", "I eat a meal.", "我吃饭。", "我吃飯。"),
      word("ko-food-basic-2", "Korean", "물", "water", "水", "水", "물", "mul", "Basic", "food", "물을 주세요.", "Water, please.", "请给我水。", "請給我水。"),
      word("ko-food-basic-3", "Korean", "빵", "bread", "面包", "麵包", "빵", "ppang", "Basic", "food", "빵을 먹어요.", "I eat bread.", "我吃面包。", "我吃麵包。"),
      word("ko-food-basic-4", "Korean", "차", "tea", "茶", "茶", "차", "cha", "Basic", "food", "차를 마셔요.", "I drink tea.", "我喝茶。", "我喝茶。"),
      word("ko-travel-basic-1", "Korean", "역", "station", "车站", "車站", "역", "yeok", "Basic", "travel", "역이 어디예요?", "Where is the station?", "车站在哪里？", "車站在哪裡？"),
      word("ko-travel-basic-2", "Korean", "공항", "airport", "机场", "機場", "공항", "gonghang", "Basic", "travel", "공항에 가요.", "I go to the airport.", "我去机场。", "我去機場。"),
      word("ko-travel-basic-3", "Korean", "기차", "train", "火车", "火車", "기차", "gicha", "Basic", "travel", "기차를 타요.", "I ride the train.", "我坐火车。", "我坐火車。"),
      word("ko-travel-basic-4", "Korean", "호텔", "hotel", "酒店", "飯店", "호텔", "hotel", "Basic", "travel", "호텔이 가까워요.", "The hotel is nearby.", "酒店很近。", "飯店很近。"),
      word("ko-life-basic-1", "Korean", "자다", "to sleep", "睡觉", "睡覺", "자다", "jada", "Basic", "daily life", "열한 시에 자요.", "I sleep at eleven.", "我十一点睡觉。", "我十一點睡覺。"),
      word("ko-life-basic-2", "Korean", "일어나다", "to wake up", "起床", "起床", "일어나다", "ireonada", "Basic", "daily life", "일곱 시에 일어나요.", "I wake up at seven.", "我七点起床。", "我七點起床。"),
      word("ko-life-basic-3", "Korean", "마시다", "to drink", "喝", "喝", "마시다", "masida", "Basic", "daily life", "물을 마셔요.", "I drink water.", "我喝水。", "我喝水。"),
      word("ko-life-basic-4", "Korean", "집에 가다", "to go home", "回家", "回家", "집에 가다", "jibe gada", "Basic", "daily life", "집에 가요.", "I go home.", "我回家。", "我回家。"),
      word("ko-numbers-basic-1", "Korean", "일곱", "seven", "七", "七", "일곱", "ilgop", "Basic", "numbers", "일곱 개 주세요.", "Seven, please.", "请给我七个。", "請給我七個。"),
      word("ko-numbers-basic-2", "Korean", "하나", "one", "一", "一", "하나", "hana", "Basic", "numbers", "하나 주세요.", "One, please.", "请给我一个。", "請給我一個。"),
      word("ko-numbers-basic-3", "Korean", "셋", "three", "三", "三", "셋", "set", "Basic", "numbers", "세 명이에요.", "There are three people.", "有三个人。", "有三個人。"),
      word("ko-numbers-basic-4", "Korean", "열", "ten", "十", "十", "열", "yeol", "Basic", "numbers", "열 개예요.", "There are ten.", "有十个。", "有十個。"),
      word("ko-verbs-basic-1", "Korean", "보다", "to see; to watch", "看", "看", "보다", "boda", "Basic", "common verbs", "드라마를 봐요.", "I watch a drama.", "我看电视剧。", "我看電視劇。"),
      word("ko-verbs-basic-2", "Korean", "가다", "to go", "去", "去", "가다", "gada", "Basic", "common verbs", "학교에 가요.", "I go to school.", "我去学校。", "我去學校。"),
      word("ko-verbs-basic-3", "Korean", "먹다", "to eat", "吃", "吃", "먹다", "meokda", "Basic", "common verbs", "사과를 먹어요.", "I eat an apple.", "我吃苹果。", "我吃蘋果。"),
      word("ko-verbs-basic-4", "Korean", "듣다", "to listen", "听", "聽", "듣다", "deutda", "Basic", "common verbs", "음악을 들어요.", "I listen to music.", "我听音乐。", "我聽音樂。"),
    ],
    Intermediate: [
      word("ko-work-intermediate-1", "Korean", "회의", "meeting", "会议", "會議", "회의", "hoeui", "Intermediate", "work", "오후에 회의가 있어요.", "There is a meeting in the afternoon.", "下午有会议。", "下午有會議。"),
      word("ko-work-intermediate-2", "Korean", "마감", "deadline", "截止日期", "截止日期", "마감", "magam", "Intermediate", "work", "마감은 금요일이에요.", "The deadline is Friday.", "截止日期是星期五。", "截止日期是星期五。"),
      word("ko-work-intermediate-3", "Korean", "자료", "materials; data", "资料", "資料", "자료", "jaryo", "Intermediate", "work", "자료를 보낼게요.", "I will send the materials.", "我会发送资料。", "我會寄送資料。"),
      word("ko-school-intermediate-1", "Korean", "과제", "assignment", "作业；课题", "作業；課題", "과제", "gwaje", "Intermediate", "school", "과제를 냈어요.", "I turned in the assignment.", "我交了作业。", "我交了作業。"),
      word("ko-school-intermediate-2", "Korean", "수업", "class; lesson", "课程", "課程", "수업", "sueop", "Intermediate", "school", "수업은 아홉 시에 시작해요.", "Class starts at nine.", "课程九点开始。", "課程九點開始。"),
      word("ko-school-intermediate-3", "Korean", "복습", "review", "复习", "複習", "복습", "bokseup", "Intermediate", "school", "매일 밤 복습해요.", "I review every night.", "我每晚复习。", "我每晚複習。"),
      word("ko-drama-intermediate-1", "Korean", "주인공", "main character", "主角", "主角", "주인공", "juingong", "Intermediate", "anime/drama", "주인공이 용감해요.", "The main character is brave.", "主角很勇敢。", "主角很勇敢。"),
      word("ko-drama-intermediate-2", "Korean", "장면", "scene", "场景", "場景", "장면", "jangmyeon", "Intermediate", "anime/drama", "이 장면을 좋아해요.", "I like this scene.", "我喜欢这个场景。", "我喜歡這個場景。"),
      word("ko-drama-intermediate-3", "Korean", "마지막 회", "final episode", "最终集", "最終集", "마지막 회", "majimak hoe", "Intermediate", "anime/drama", "마지막 회를 봤어요.", "I watched the final episode.", "我看了最终集。", "我看了最終集。"),
    ],
    Advanced: [
      word("ko-topik-advanced-1", "Korean", "유지하다", "to maintain", "维持", "維持", "유지하다", "yujihada", "Advanced", "TOPIK", "건강한 습관을 유지해야 합니다.", "You should maintain healthy habits.", "应该维持健康的习惯。", "應該維持健康的習慣。"),
      word("ko-topik-advanced-2", "Korean", "설득하다", "to persuade", "说服", "說服", "설득하다", "seoldeukada", "Advanced", "TOPIK", "친구를 설득했습니다.", "I persuaded my friend.", "我说服了朋友。", "我說服了朋友。"),
      word("ko-topik-advanced-3", "Korean", "뚜렷하다", "clear; distinct", "明显的", "明顯的", "뚜렷하다", "tturyeotada", "Advanced", "TOPIK", "차이가 뚜렷합니다.", "The difference is clear.", "差异很明显。", "差異很明顯。"),
      word("ko-topik-advanced-4", "Korean", "반영하다", "to reflect", "反映", "反映", "반영하다", "banyeonghada", "Advanced", "TOPIK", "의견을 반영했습니다.", "I reflected the feedback.", "我反映了意见。", "我反映了意見。"),
    ],
  },
};

export const vocabularySeed = Object.values(vocabularyDictionary).flatMap((byLevel) =>
  Object.values(byLevel).flat()
);

function word(id: string, lang: TargetLanguage, text: string, en: string, zh: string, zht: string, reading: string, romanization: string, level: Level, topic: Topic, example: string, exEn: string, exZh: string, exZht: string): Word {
  return { id, lang, text, meanings: { English: en, "Simplified Chinese": zh, "Traditional Chinese": zht }, reading, romanization, level, topic, example, translations: { English: exEn, "Simplified Chinese": exZh, "Traditional Chinese": exZht } };
}
