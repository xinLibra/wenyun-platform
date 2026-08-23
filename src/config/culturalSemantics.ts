/**
 * 文化语义表：场景 → 寓意 → 纹样
 *
 * 用途：自然语言输入解析（毕业/新婚/乔迁…）→ 推荐纹样并自动勾选主题/子类。
 * 每一条记录描述一个「使用场景」，包含：
 *   - scene    场景名称（如「毕业/升学」）
 *   - keywords 该场景下可能输入的关键词（用于包含匹配）
 *   - meaning  该场景下选择该纹样的寓意
 *   - patternLabel 纹样中文名
 *   - patternId    对应 patternTaxonomy 的子类 id（必须严格对齐）
 *   - themeId      所属主题（floral / beast）
 */
export interface CulturalSemantic {
  id: string
  scene: string
  keywords: string[]
  meaning: string
  patternLabel: string
  patternId: string
  themeId: 'floral' | 'beast'
}

/** 匹配命中强度：关键词命中的权重 */
export const SEMANTIC_MATCH_WEIGHT = 10

export const CULTURAL_SEMANTICS: CulturalSemantic[] = [
  // ==================== 凤鸟纹 ====================
  { id: 'phoenix_bird_1', scene: '毕业/升学', keywords: ['毕业', '升学', '学业', '毕业典礼', '学有所成'], meaning: '凤凰涅槃、学成高飞，寓意前程似锦', patternLabel: '凤鸟纹', patternId: 'phoenix_bird', themeId: 'beast' },
  { id: 'phoenix_bird_2', scene: '婚礼/新婚', keywords: ['婚礼', '新婚', '结婚', '喜事', '婚庆'], meaning: '凤为百鸟之王，象征尊贵吉祥，婚庆纳福', patternLabel: '凤鸟纹', patternId: 'phoenix_bird', themeId: 'beast' },
  { id: 'phoenix_bird_3', scene: '乔迁/新居', keywords: ['乔迁', '新居', '搬家', '入宅', '新房'], meaning: '凤凰来仪，寓意新居兴旺、家宅安宁', patternLabel: '凤鸟纹', patternId: 'phoenix_bird', themeId: 'beast' },
  { id: 'phoenix_bird_4', scene: '开业/升职', keywords: ['开业', '升职', '晋升', '高升', '事业'], meaning: '凤翔九天，寓意事业腾达、步步高升', patternLabel: '凤鸟纹', patternId: 'phoenix_bird', themeId: 'beast' },
  { id: 'phoenix_bird_5', scene: '新年/春节', keywords: ['新年', '春节', '过年', '新春', '迎春'], meaning: '凤凰呈祥，寓意新春吉庆、万象更新', patternLabel: '凤鸟纹', patternId: 'phoenix_bird', themeId: 'beast' },
  { id: 'phoenix_bird_6', scene: '生日/生辰', keywords: ['生日', '生辰', '庆生', '寿辰'], meaning: '凤鸣朝阳，寓意福寿绵长、朝气蓬勃', patternLabel: '凤鸟纹', patternId: 'phoenix_bird', themeId: 'beast' },
  { id: 'phoenix_bird_7', scene: '文化礼品', keywords: ['礼品', '伴手礼', '文创', '纪念品', '送礼'], meaning: '凤凰文化底蕴深厚，是尊贵大气的赠礼之选', patternLabel: '凤鸟纹', patternId: 'phoenix_bird', themeId: 'beast' },
  { id: 'phoenix_bird_8', scene: '节日庆典', keywords: ['庆典', '宴会', '节日', '仪式'], meaning: '凤凰仪态华美，契合喜庆庄重的典礼场合', patternLabel: '凤鸟纹', patternId: 'phoenix_bird', themeId: 'beast' },
  { id: 'phoenix_bird_9', scene: '女儿/嫁娶', keywords: ['女儿', '出嫁', '嫁娶', '千金'], meaning: '凤为女性尊贵之象，寓意女儿幸福美满', patternLabel: '凤鸟纹', patternId: 'phoenix_bird', themeId: 'beast' },
  { id: 'phoenix_bird_10', scene: '传统服饰', keywords: ['汉服', '旗袍', '礼服', '服饰', '衣饰'], meaning: '凤纹华美，为传统服饰点睛的经典纹样', patternLabel: '凤鸟纹', patternId: 'phoenix_bird', themeId: 'beast' },
  { id: 'phoenix_bird_11', scene: '镇宅/祈福', keywords: ['镇宅', '祈福', '平安', '辟邪', '护佑'], meaning: '凤为瑞鸟，寓意护佑家宅、岁岁平安', patternLabel: '凤鸟纹', patternId: 'phoenix_bird', themeId: 'beast' },

  // ==================== 鹤纹 ====================
  { id: 'crane_1', scene: '寿辰/祝寿', keywords: ['寿辰', '祝寿', '寿宴', '老人', '高寿'], meaning: '松鹤延年，寓意长寿安康、福寿双全', patternLabel: '鹤纹', patternId: 'crane', themeId: 'beast' },
  { id: 'crane_2', scene: '毕业/升学', keywords: ['毕业', '升学', '学业', '高中', '学成'], meaning: '鹤鸣九皋、一飞冲天，寓意学业高远', patternLabel: '鹤纹', patternId: 'crane', themeId: 'beast' },
  { id: 'crane_3', scene: '升职/高升', keywords: ['升职', '高升', '晋升', '官运', '事业'], meaning: '鹤立云表，寓意仕途通达、青云直上', patternLabel: '鹤纹', patternId: 'crane', themeId: 'beast' },
  { id: 'crane_4', scene: '长辈馈赠', keywords: ['长辈', '父母', '老师', '敬赠', '感恩'], meaning: '仙鹤高洁，表达对长者的敬意与祝福', patternLabel: '鹤纹', patternId: 'crane', themeId: 'beast' },
  { id: 'crane_5', scene: '文人雅趣', keywords: ['文人', '雅致', '清雅', '书斋', '文房'], meaning: '鹤格高雅，寄托文人高洁脱俗的志趣', patternLabel: '鹤纹', patternId: 'crane', themeId: 'beast' },
  { id: 'crane_6', scene: '生日/生辰', keywords: ['生日', '生辰', '庆生'], meaning: '鹤龄延年，寓意健康长寿、福气绵长', patternLabel: '鹤纹', patternId: 'crane', themeId: 'beast' },
  { id: 'crane_7', scene: '乔迁/新居', keywords: ['乔迁', '新居', '搬家', '入宅'], meaning: '鹤栖高枝，寓意新居吉祥、家业兴旺', patternLabel: '鹤纹', patternId: 'crane', themeId: 'beast' },
  { id: 'crane_8', scene: '宁静养生', keywords: ['养生', '宁静', '安详', '闲适', '退休'], meaning: '仙鹤悠游，契合养生静养的悠然心境', patternLabel: '鹤纹', patternId: 'crane', themeId: 'beast' },
  { id: 'crane_9', scene: '传统服饰', keywords: ['汉服', '服饰', '衣饰', '长袍'], meaning: '一品仙鹤，明清文官补子经典纹样', patternLabel: '鹤纹', patternId: 'crane', themeId: 'beast' },
  { id: 'crane_10', scene: '文化礼品', keywords: ['礼品', '伴手礼', '送礼', '纪念品'], meaning: '仙鹤寓意健康长寿，送礼得体有心意', patternLabel: '鹤纹', patternId: 'crane', themeId: 'beast' },

  // ==================== 蝴蝶纹 ====================
  { id: 'butterfly_1', scene: '婚恋/爱情', keywords: ['爱情', '恋情', '恋爱', '成双', '比翼'], meaning: '蝶恋花、双蝶齐飞，寓意比翼双飞、爱情美满', patternLabel: '蝴蝶纹', patternId: 'butterfly', themeId: 'beast' },
  { id: 'butterfly_2', scene: '婚礼/新婚', keywords: ['婚礼', '新婚', '结婚', '喜事'], meaning: '双蝶成双，祝福新人琴瑟和鸣、幸福一生', patternLabel: '蝴蝶纹', patternId: 'butterfly', themeId: 'beast' },
  { id: 'butterfly_3', scene: '长寿/健康', keywords: ['长寿', '健康', '康宁', '平安'], meaning: '蝶与耄耋谐音，寓意福寿绵长、健康常伴', patternLabel: '蝴蝶纹', patternId: 'butterfly', themeId: 'beast' },
  { id: 'butterfly_4', scene: '生日/生辰', keywords: ['生日', '生辰', '庆生'], meaning: '彩蝶翩翩，寓意生日喜庆、快乐美满', patternLabel: '蝴蝶纹', patternId: 'butterfly', themeId: 'beast' },
  { id: 'butterfly_5', scene: '春天/踏青', keywords: ['春天', '春意', '踏青', '花开'], meaning: '蝶舞花间，寓意春意盎然、生机勃勃', patternLabel: '蝴蝶纹', patternId: 'butterfly', themeId: 'beast' },
  { id: 'butterfly_6', scene: '少女/闺秀', keywords: ['少女', '女儿', '女孩', '闺秀'], meaning: '蝴蝶轻灵秀美，适合少女闺中雅物', patternLabel: '蝴蝶纹', patternId: 'butterfly', themeId: 'beast' },
  { id: 'butterfly_7', scene: '文化礼品', keywords: ['礼品', '伴手礼', '送礼', '纪念品'], meaning: '蝴蝶寓意美满幸福，是灵动的赠礼之选', patternLabel: '蝴蝶纹', patternId: 'butterfly', themeId: 'beast' },
  { id: 'butterfly_8', scene: '家居装饰', keywords: ['家居', '装饰', '挂画', '布置'], meaning: '蝶舞轻盈，为家居增添灵动雅趣', patternLabel: '蝴蝶纹', patternId: 'butterfly', themeId: 'beast' },
  { id: 'butterfly_9', scene: '传统服饰', keywords: ['汉服', '旗袍', '服饰', '衣饰'], meaning: '蝴蝶灵动秀美，点缀服饰柔美出尘', patternLabel: '蝴蝶纹', patternId: 'butterfly', themeId: 'beast' },
  { id: 'butterfly_10', scene: '涅槃/新生', keywords: ['新生', '蜕变', '重生', '成长'], meaning: '破茧成蝶，寓意蜕变重生、焕然一新', patternLabel: '蝴蝶纹', patternId: 'butterfly', themeId: 'beast' },

  // ==================== 虎纹 ====================
  { id: 'tiger_1', scene: '护佑/辟邪', keywords: ['辟邪', '护佑', '镇宅', '驱邪', '保平安'], meaning: '虎为百兽之王，威猛辟邪，护佑平安', patternLabel: '虎纹', patternId: 'tiger', themeId: 'beast' },
  { id: 'tiger_2', scene: '勇武/气魄', keywords: ['勇武', '威猛', '气魄', '胆识', '力量'], meaning: '虎虎生威，寓意刚健勇猛、气势非凡', patternLabel: '虎纹', patternId: 'tiger', themeId: 'beast' },
  { id: 'tiger_3', scene: '生肖/本命年', keywords: ['虎年', '本命年', '生肖', '属虎'], meaning: '虎年生肖纹样，寓意本命年威风凛凛', patternLabel: '虎纹', patternId: 'tiger', themeId: 'beast' },
  { id: 'tiger_4', scene: '成年礼/加冠', keywords: ['成年礼', '成人礼', '加冠', '十八岁'], meaning: '虎威加身，寓意长大成人、担当有为', patternLabel: '虎纹', patternId: 'tiger', themeId: 'beast' },
  { id: 'tiger_5', scene: '军人/武职', keywords: ['军人', '武将', '武职', '刚毅'], meaning: '虎符虎将，寓意军威赫赫、勇冠三军', patternLabel: '虎纹', patternId: 'tiger', themeId: 'beast' },
  { id: 'tiger_6', scene: '创业/开疆', keywords: ['创业', '开拓', '开疆', '打拼'], meaning: '如虎添翼，寓意事业开疆拓土、势不可挡', patternLabel: '虎纹', patternId: 'tiger', themeId: 'beast' },
  { id: 'tiger_7', scene: '童趣/虎头', keywords: ['小孩', '虎头鞋', '童趣', '婴儿', '宝宝'], meaning: '虎头虎脑，传统童装护佑小儿平安长大', patternLabel: '虎纹', patternId: 'tiger', themeId: 'beast' },
  { id: 'tiger_8', scene: '新年/春节', keywords: ['新年', '春节', '过年', '新春'], meaning: '虎年大吉，寓意新的一年虎气冲天', patternLabel: '虎纹', patternId: 'tiger', themeId: 'beast' },
  { id: 'tiger_9', scene: '家居装饰', keywords: ['家居', '装饰', '挂画', '布置'], meaning: '虎纹威严大气，为家居增添阳刚之气', patternLabel: '虎纹', patternId: 'tiger', themeId: 'beast' },
  { id: 'tiger_10', scene: '文化礼品', keywords: ['礼品', '送礼', '伴手礼'], meaning: '虎纹勇毅刚健，是阳刚大气的赠礼选择', patternLabel: '虎纹', patternId: 'tiger', themeId: 'beast' },

  // ==================== 孔雀纹 ====================
  { id: 'peacock_1', scene: '富贵/繁荣', keywords: ['富贵', '繁荣', '富丽', '昌盛'], meaning: '孔雀开屏，寓意富贵荣华、前程锦绣', patternLabel: '孔雀纹', patternId: 'peacock', themeId: 'beast' },
  { id: 'peacock_2', scene: '婚礼/新婚', keywords: ['婚礼', '新婚', '结婚', '喜事'], meaning: '孔雀开屏呈祥，祝福新人富贵美满', patternLabel: '孔雀纹', patternId: 'peacock', themeId: 'beast' },
  { id: 'peacock_3', scene: '仕途/功名', keywords: ['仕途', '功名', '科举', '及第', '功成名就'], meaning: '孔雀三品官补，寓意仕途得意、功名加身', patternLabel: '孔雀纹', patternId: 'peacock', themeId: 'beast' },
  { id: 'peacock_4', scene: '开业/庆典', keywords: ['开业', '庆典', '盛典', '庆祝'], meaning: '孔雀华彩，寓意事业开张大吉、红红火火', patternLabel: '孔雀纹', patternId: 'peacock', themeId: 'beast' },
  { id: 'peacock_5', scene: '尊贵/高雅', keywords: ['尊贵', '高雅', '华贵', '气质'], meaning: '孔雀仪态雍容，彰显华贵高雅的气质', patternLabel: '孔雀纹', patternId: 'peacock', themeId: 'beast' },
  { id: 'peacock_6', scene: '家居装饰', keywords: ['家居', '装饰', '屏风', '挂画'], meaning: '孔雀屏开满堂彩，是华丽的装饰纹样', patternLabel: '孔雀纹', patternId: 'peacock', themeId: 'beast' },
  { id: 'peacock_7', scene: '传统服饰', keywords: ['汉服', '礼服', '服饰', '衣饰'], meaning: '孔雀羽纹华丽，点亮华服之美', patternLabel: '孔雀纹', patternId: 'peacock', themeId: 'beast' },
  { id: 'peacock_8', scene: '文化礼品', keywords: ['礼品', '送礼', '伴手礼', '纪念品'], meaning: '孔雀象征富贵吉祥，是华美大气的赠礼', patternLabel: '孔雀纹', patternId: 'peacock', themeId: 'beast' },
  { id: 'peacock_9', scene: '爱情/伴侣', keywords: ['爱情', '伴侣', '求偶', '择偶'], meaning: '孔雀求偶开屏，寓意倾慕眷恋、情意绵长', patternLabel: '孔雀纹', patternId: 'peacock', themeId: 'beast' },
  { id: 'peacock_10', scene: '节庆/盛宴', keywords: ['节庆', '宴会', '盛宴', '吉庆'], meaning: '孔雀华羽，为节庆盛宴增添雍容气象', patternLabel: '孔雀纹', patternId: 'peacock', themeId: 'beast' },

  // ==================== 龙纹 ====================
  { id: 'dragon_1', scene: '尊贵/权威', keywords: ['尊贵', '权威', '王者', '皇权', '大气'], meaning: '龙为九五之尊，寓意尊贵威严、气度非凡', patternLabel: '龙纹', patternId: 'dragon', themeId: 'beast' },
  { id: 'dragon_2', scene: '事业/腾飞', keywords: ['事业', '腾飞', '飞黄腾达', '蒸蒸日上'], meaning: '飞龙在天，寓意事业腾达、大展宏图', patternLabel: '龙纹', patternId: 'dragon', themeId: 'beast' },
  { id: 'dragon_3', scene: '新年/春节', keywords: ['新年', '春节', '过年', '新春', '龙年'], meaning: '龙腾盛世，寓意新的一年吉祥如意、福运亨通', patternLabel: '龙纹', patternId: 'dragon', themeId: 'beast' },
  { id: 'dragon_4', scene: '端午/龙舟', keywords: ['端午', '龙舟', '赛龙舟', '粽子'], meaning: '龙舟竞渡，寓意奋发进取、同舟共济', patternLabel: '龙纹', patternId: 'dragon', themeId: 'beast' },
  { id: 'dragon_5', scene: '开疆/创业', keywords: ['创业', '开疆', '宏图', '基业'], meaning: '潜龙出渊，寓意创业兴邦、基业长青', patternLabel: '龙纹', patternId: 'dragon', themeId: 'beast' },
  { id: 'dragon_6', scene: '男子/顶梁', keywords: ['男儿', '顶梁', '栋梁', '担当'], meaning: '人中龙凤，寓意男儿志存高远、堪当大任', patternLabel: '龙纹', patternId: 'dragon', themeId: 'beast' },
  { id: 'dragon_7', scene: '镇宅/祈福', keywords: ['镇宅', '祈福', '护佑', '辟邪'], meaning: '龙能兴云雨，寓意镇宅纳福、护佑家宅', patternLabel: '龙纹', patternId: 'dragon', themeId: 'beast' },
  { id: 'dragon_8', scene: '传统服饰', keywords: ['汉服', '龙袍', '礼服', '服饰'], meaning: '龙袍加身，传统服饰中的至尊纹样', patternLabel: '龙纹', patternId: 'dragon', themeId: 'beast' },
  { id: 'dragon_9', scene: '建筑/雕梁', keywords: ['建筑', '雕梁', '画栋', '宫阙'], meaning: '雕龙画栋，古建装饰中的大气纹样', patternLabel: '龙纹', patternId: 'dragon', themeId: 'beast' },
  { id: 'dragon_10', scene: '文化礼品', keywords: ['礼品', '送礼', '伴手礼', '纪念品'], meaning: '龙纹气势磅礴，是寓意深远的大气赠礼', patternLabel: '龙纹', patternId: 'dragon', themeId: 'beast' },

  // ==================== 龙凤纹 ====================
  { id: 'dragon_phoenix_1', scene: '婚礼/新婚', keywords: ['婚礼', '新婚', '结婚', '喜事', '婚庆'], meaning: '龙凤呈祥，寓意新人百年好合、珠联璧合', patternLabel: '龙凤纹', patternId: 'dragon_phoenix', themeId: 'beast' },
  { id: 'dragon_phoenix_2', scene: '订婚/良缘', keywords: ['订婚', '良缘', '定亲', '求婚', '提亲'], meaning: '龙凤相配，寓意天作之合、佳偶天成', patternLabel: '龙凤纹', patternId: 'dragon_phoenix', themeId: 'beast' },
  { id: 'dragon_phoenix_3', scene: '婚礼请柬', keywords: ['请柬', '喜帖', '喜糖', '伴手礼'], meaning: '龙凤呈祥是婚庆喜品最经典的吉祥纹样', patternLabel: '龙凤纹', patternId: 'dragon_phoenix', themeId: 'beast' },
  { id: 'dragon_phoenix_4', scene: '嫁妆/陪嫁', keywords: ['嫁妆', '陪嫁', '嫁衣', '喜被'], meaning: '龙凤被面，寓意新人鸾凤和鸣、白头偕老', patternLabel: '龙凤纹', patternId: 'dragon_phoenix', themeId: 'beast' },
  { id: 'dragon_phoenix_5', scene: '婚房布置', keywords: ['婚房', '喜房', '布置', '装饰'], meaning: '龙凤呈祥装点婚房，寓意喜气盈门、和美圆满', patternLabel: '龙凤纹', patternId: 'dragon_phoenix', themeId: 'beast' },
  { id: 'dragon_phoenix_6', scene: '纪念日', keywords: ['纪念日', '结婚周年', '金婚', '银婚'], meaning: '龙凤相伴一生，纪念伉俪情深、岁月同心', patternLabel: '龙凤纹', patternId: 'dragon_phoenix', themeId: 'beast' },
  { id: 'dragon_phoenix_7', scene: '中和/平衡', keywords: ['阴阳', '和谐', '平衡', '圆满'], meaning: '龙阳凤阴、刚柔相济，寓意阴阳和合、圆满和谐', patternLabel: '龙凤纹', patternId: 'dragon_phoenix', themeId: 'beast' },
  { id: 'dragon_phoenix_8', scene: '节日/庆典', keywords: ['节庆', '庆典', '盛典', '吉庆'], meaning: '龙凤呈祥，为庆典吉日增添隆重喜气', patternLabel: '龙凤纹', patternId: 'dragon_phoenix', themeId: 'beast' },
  { id: 'dragon_phoenix_9', scene: '传统服饰', keywords: ['汉服', '婚服', '礼服', '服饰'], meaning: '龙凤婚服华丽庄重，是传统婚礼的至高纹样', patternLabel: '龙凤纹', patternId: 'dragon_phoenix', themeId: 'beast' },
  { id: 'dragon_phoenix_10', scene: '文化礼品', keywords: ['礼品', '送礼', '伴手礼'], meaning: '龙凤呈祥寓意美好，是婚礼赠礼的上选', patternLabel: '龙凤纹', patternId: 'dragon_phoenix', themeId: 'beast' },

  // ==================== 鹿纹 ====================
  { id: 'deer_1', scene: '功名利禄', keywords: ['功名', '利禄', '升官', '仕途', '禄'], meaning: '鹿与禄谐音，寓意加官进爵、禄位亨通', patternLabel: '鹿纹', patternId: 'deer', themeId: 'beast' },
  { id: 'deer_2', scene: '升职/高升', keywords: ['升职', '高升', '晋升', '事业'], meaning: '鹿逐青云，寓意事业顺遂、步步高升', patternLabel: '鹿纹', patternId: 'deer', themeId: 'beast' },
  { id: 'deer_3', scene: '长寿/康宁', keywords: ['长寿', '康宁', '健康', '延年'], meaning: '鹿寿千年，寓意健康长寿、福寿安康', patternLabel: '鹿纹', patternId: 'deer', themeId: 'beast' },
  { id: 'deer_4', scene: '山林/自然', keywords: ['山林', '自然', '隐逸', '田园'], meaning: '鹿栖林间，寓意返璞归真、悠然自得', patternLabel: '鹿纹', patternId: 'deer', themeId: 'beast' },
  { id: 'deer_5', scene: '福禄双全', keywords: ['福禄', '福气', '纳福', '福运'], meaning: '福禄寿喜，鹿纹寓意福禄双全、喜气临门', patternLabel: '鹿纹', patternId: 'deer', themeId: 'beast' },
  { id: 'deer_6', scene: '学业/中举', keywords: ['中举', '及第', '学业', '金榜题名'], meaning: '鹿鸣宴上，寓意金榜题名、蟾宫折桂', patternLabel: '鹿纹', patternId: 'deer', themeId: 'beast' },
  { id: 'deer_7', scene: '乔迁/新居', keywords: ['乔迁', '新居', '搬家', '入宅'], meaning: '鹿临吉宅，寓意新居福禄齐来、安居乐业', patternLabel: '鹿纹', patternId: 'deer', themeId: 'beast' },
  { id: 'deer_8', scene: '传统服饰', keywords: ['汉服', '补子', '服饰', '衣饰'], meaning: '鹿纹补子，明清文官显贵的身份纹样', patternLabel: '鹿纹', patternId: 'deer', themeId: 'beast' },
  { id: 'deer_9', scene: '文化礼品', keywords: ['礼品', '送礼', '伴手礼', '纪念品'], meaning: '鹿兆祥瑞，寓意福禄绵长，是吉祥的赠礼', patternLabel: '鹿纹', patternId: 'deer', themeId: 'beast' },
  { id: 'deer_10', scene: '镇宅/祈福', keywords: ['镇宅', '祈福', '平安', '祥瑞'], meaning: '瑞鹿呈祥，寓意家宅安宁、祥瑞护佑', patternLabel: '鹿纹', patternId: 'deer', themeId: 'beast' },

  // ==================== 狮纹 ====================
  { id: 'lion_1', scene: '辟邪/镇宅', keywords: ['辟邪', '镇宅', '石狮', '守门', '护佑'], meaning: '狮子守门，寓意镇宅辟邪、家宅平安', patternLabel: '狮纹', patternId: 'lion', themeId: 'beast' },
  { id: 'lion_2', scene: '喜庆/热闹', keywords: ['舞狮', '喜庆', '热闹', '庆典', '节庆'], meaning: '瑞狮欢舞，寓意喜庆热闹、喜气盈门', patternLabel: '狮纹', patternId: 'lion', themeId: 'beast' },
  { id: 'lion_3', scene: '开业/开张', keywords: ['开业', '开张', '舞狮', '生意'], meaning: '金狮点睛，寓意开业大吉、生意兴隆', patternLabel: '狮纹', patternId: 'lion', themeId: 'beast' },
  { id: 'lion_4', scene: '勇猛/守护', keywords: ['勇猛', '守护', '忠诚', '威严'], meaning: '狮子威猛忠勇，寓意守护家人、威严有度', patternLabel: '狮纹', patternId: 'lion', themeId: 'beast' },
  { id: 'lion_5', scene: '太狮少狮', keywords: ['太师', '少师', '高官', '爵位', '功名'], meaning: '太狮少狮谐音太师少师，寓意官高爵显、代代显贵', patternLabel: '狮纹', patternId: 'lion', themeId: 'beast' },
  { id: 'lion_6', scene: '新年/春节', keywords: ['新年', '春节', '过年', '新春'], meaning: '新春舞狮，寓意驱邪纳福、岁岁平安', patternLabel: '狮纹', patternId: 'lion', themeId: 'beast' },
  { id: 'lion_7', scene: '童趣/玩偶', keywords: ['小孩', '玩偶', '童趣', '宝宝'], meaning: '憨态可掬的瑞狮，守护孩童平安喜乐', patternLabel: '狮纹', patternId: 'lion', themeId: 'beast' },
  { id: 'lion_8', scene: '建筑/石雕', keywords: ['建筑', '石雕', '门墩', '园林'], meaning: '石狮守门，古建园林中的经典守护纹样', patternLabel: '狮纹', patternId: 'lion', themeId: 'beast' },
  { id: 'lion_9', scene: '文化礼品', keywords: ['礼品', '送礼', '伴手礼'], meaning: '瑞狮纳福，寓意平安吉祥，是喜庆的赠礼', patternLabel: '狮纹', patternId: 'lion', themeId: 'beast' },
  { id: 'lion_10', scene: '传统服饰', keywords: ['汉服', '服饰', '衣饰', '绣品'], meaning: '狮子滚绣球，传统绣品上的经典吉祥纹样', patternLabel: '狮纹', patternId: 'lion', themeId: 'beast' },

  // ==================== 牡丹纹 ====================
  { id: 'peony_1', scene: '富贵/荣华', keywords: ['富贵', '荣华', '富贵花开', '富丽'], meaning: '花开富贵，牡丹为花中之王，寓意富贵荣华', patternLabel: '牡丹纹', patternId: 'peony', themeId: 'floral' },
  { id: 'peony_2', scene: '新婚/婚庆', keywords: ['婚礼', '新婚', '结婚', '喜事', '婚庆'], meaning: '牡丹富贵天成，祝福新人婚后富贵美满', patternLabel: '牡丹纹', patternId: 'peony', themeId: 'floral' },
  { id: 'peony_3', scene: '家居装饰', keywords: ['家居', '装饰', '挂画', '屏风', '布置'], meaning: '花开富贵装点厅堂，寓意家业兴旺、富丽堂皇', patternLabel: '牡丹纹', patternId: 'peony', themeId: 'floral' },
  { id: 'peony_4', scene: '开业/开张', keywords: ['开业', '开张', '生意', '兴隆'], meaning: '牡丹盛开，寓意生意兴隆、财源广进', patternLabel: '牡丹纹', patternId: 'peony', themeId: 'floral' },
  { id: 'peony_5', scene: '乔迁/新居', keywords: ['乔迁', '新居', '搬家', '入宅'], meaning: '牡丹迎宾，寓意新居富贵安康、吉祥如意', patternLabel: '牡丹纹', patternId: 'peony', themeId: 'floral' },
  { id: 'peony_6', scene: '母亲/感恩', keywords: ['母亲', '感恩', '慈爱', '亲情'], meaning: '牡丹雍容，寓意母仪之美、慈爱富贵', patternLabel: '牡丹纹', patternId: 'peony', themeId: 'floral' },
  { id: 'peony_7', scene: '生日/生辰', keywords: ['生日', '生辰', '庆生'], meaning: '牡丹贺寿，寓意生活富足、福气满堂', patternLabel: '牡丹纹', patternId: 'peony', themeId: 'floral' },
  { id: 'peony_8', scene: '传统服饰', keywords: ['汉服', '旗袍', '礼服', '服饰'], meaning: '国色天香，牡丹是传统华服的经典纹样', patternLabel: '牡丹纹', patternId: 'peony', themeId: 'floral' },
  { id: 'peony_9', scene: '文化礼品', keywords: ['礼品', '送礼', '伴手礼', '纪念品'], meaning: '花开富贵寓意美好，是雅俗共赏的赠礼', patternLabel: '牡丹纹', patternId: 'peony', themeId: 'floral' },
  { id: 'peony_10', scene: '春季节庆', keywords: ['春天', '春节', '花开', '赏花'], meaning: '春满牡丹园，寓意春意盎然、富贵盈门', patternLabel: '牡丹纹', patternId: 'peony', themeId: 'floral' },

  // ==================== 莲花纹 ====================
  { id: 'lotus_1', scene: '纯洁/清廉', keywords: ['清廉', '高洁', '出淤泥不染', '正直'], meaning: '出淤泥而不染，寓意清正廉洁、高风亮节', patternLabel: '莲花纹', patternId: 'lotus', themeId: 'floral' },
  { id: 'lotus_2', scene: '宗教/禅意', keywords: ['禅意', '佛系', '修行', '净心'], meaning: '莲为佛前圣花，寓意清净庄严、明心见性', patternLabel: '莲花纹', patternId: 'lotus', themeId: 'floral' },
  { id: 'lotus_3', scene: '新婚/早生贵子', keywords: ['新婚', '早生贵子', '连生贵子', '求子'], meaning: '莲蓬多子，寓意连生贵子、子孙满堂', patternLabel: '莲花纹', patternId: 'lotus', themeId: 'floral' },
  { id: 'lotus_4', scene: '夏日/清凉', keywords: ['夏天', '夏日', '清凉', '荷塘'], meaning: '映日荷花，寓意清凉雅致、心静自然凉', patternLabel: '莲花纹', patternId: 'lotus', themeId: 'floral' },
  { id: 'lotus_5', scene: '文人/雅士', keywords: ['文人', '雅士', '书斋', '清雅'], meaning: '爱莲说传世，莲花为文人雅士清正之志', patternLabel: '莲花纹', patternId: 'lotus', themeId: 'floral' },
  { id: 'lotus_6', scene: '中元/祈福', keywords: ['祈福', '平安', '河灯', '普渡'], meaning: '莲灯照路，寓意祈福纳祥、平安顺遂', patternLabel: '莲花纹', patternId: 'lotus', themeId: 'floral' },
  { id: 'lotus_7', scene: '家居装饰', keywords: ['家居', '装饰', '布置', '挂画'], meaning: '荷塘清韵，为家居增添清雅祥和之气', patternLabel: '莲花纹', patternId: 'lotus', themeId: 'floral' },
  { id: 'lotus_8', scene: '传统服饰', keywords: ['汉服', '服饰', '衣饰', '绣品'], meaning: '莲纹清丽，传统服饰上寓意吉祥的纹样', patternLabel: '莲花纹', patternId: 'lotus', themeId: 'floral' },
  { id: 'lotus_9', scene: '婚礼回礼', keywords: ['回礼', '伴手礼', '喜糖', '礼盒'], meaning: '并蒂莲开，寓意佳偶同心、永结同心', patternLabel: '莲花纹', patternId: 'lotus', themeId: 'floral' },
  { id: 'lotus_10', scene: '文化礼品', keywords: ['礼品', '送礼', '纪念品'], meaning: '莲韵清雅，寓意高洁平安，是雅致的赠礼', patternLabel: '莲花纹', patternId: 'lotus', themeId: 'floral' },

  // ==================== 菊花纹 ====================
  { id: 'chrysanthemum_1', scene: '长寿/康宁', keywords: ['长寿', '重阳', '康宁', '延年'], meaning: '菊为长寿之花，寓意延年益寿、健康安宁', patternLabel: '菊花纹', patternId: 'chrysanthemum', themeId: 'floral' },
  { id: 'chrysanthemum_2', scene: '重阳节', keywords: ['重阳', '登高', '敬老'], meaning: '重阳赏菊，寓意敬老尊贤、福寿绵长', patternLabel: '菊花纹', patternId: 'chrysanthemum', themeId: 'floral' },
  { id: 'chrysanthemum_3', scene: '秋日/丰收', keywords: ['秋天', '秋日', '丰收', '金秋'], meaning: '菊傲秋霜，寓意秋收丰盈、成果累累', patternLabel: '菊花纹', patternId: 'chrysanthemum', themeId: 'floral' },
  { id: 'chrysanthemum_4', scene: '隐逸/淡泊', keywords: ['隐逸', '淡泊', '归隐', '田园'], meaning: '采菊东篱下，寓意淡泊明志、悠然自得', patternLabel: '菊花纹', patternId: 'chrysanthemum', themeId: 'floral' },
  { id: 'chrysanthemum_5', scene: '坚贞/傲骨', keywords: ['坚贞', '傲骨', '不屈', '坚韧'], meaning: '凌霜绽放，寓意风骨凛然、百折不挠', patternLabel: '菊花纹', patternId: 'chrysanthemum', themeId: 'floral' },
  { id: 'chrysanthemum_6', scene: '文人/四君子', keywords: ['文人', '四君子', '梅兰竹菊', '雅士'], meaning: '菊列四君子，寓意君子高洁、德馨远播', patternLabel: '菊花纹', patternId: 'chrysanthemum', themeId: 'floral' },
  { id: 'chrysanthemum_7', scene: '长辈寿辰', keywords: ['寿辰', '祝寿', '老人', '寿宴'], meaning: '菊寿延年，是敬献长辈的祝寿佳纹', patternLabel: '菊花纹', patternId: 'chrysanthemum', themeId: 'floral' },
  { id: 'chrysanthemum_8', scene: '传统服饰', keywords: ['汉服', '服饰', '衣饰', '绣品'], meaning: '菊纹清雅，点缀传统服饰尽显雅韵', patternLabel: '菊花纹', patternId: 'chrysanthemum', themeId: 'floral' },
  { id: 'chrysanthemum_9', scene: '家居装饰', keywords: ['家居', '装饰', '布置', '挂画'], meaning: '东篱菊影，为家居增添清雅淡然之气', patternLabel: '菊花纹', patternId: 'chrysanthemum', themeId: 'floral' },
  { id: 'chrysanthemum_10', scene: '文化礼品', keywords: ['礼品', '送礼', '伴手礼'], meaning: '菊韵清和，寓意长寿康宁，是雅致的赠礼', patternLabel: '菊花纹', patternId: 'chrysanthemum', themeId: 'floral' },

  // ==================== 梅花纹 ====================
  { id: 'plum_1', scene: '坚韧/傲骨', keywords: ['坚韧', '傲骨', '坚强', '梅花香自苦寒来'], meaning: '凌寒独自开，寓意坚韧不拔、自强不息', patternLabel: '梅花纹', patternId: 'plum', themeId: 'floral' },
  { id: 'plum_2', scene: '报春/新生', keywords: ['报春', '新春', '初春', '生机'], meaning: '梅花报春，寓意生机勃发、万象更新', patternLabel: '梅花纹', patternId: 'plum', themeId: 'floral' },
  { id: 'plum_3', scene: '高洁/雅士', keywords: ['高洁', '雅士', '清高', '君子'], meaning: '梅列四君子之首，寓意高洁脱俗、品德清正', patternLabel: '梅花纹', patternId: 'plum', themeId: 'floral' },
  { id: 'plum_4', scene: '新年/春节', keywords: ['新年', '春节', '过年', '迎春'], meaning: '喜上梅梢，寓意新春吉祥、喜气临门', patternLabel: '梅花纹', patternId: 'plum', themeId: 'floral' },
  { id: 'plum_5', scene: '励志/求学', keywords: ['励志', '求学', '苦读', '寒窗'], meaning: '宝剑锋从磨砺出，寓意寒窗苦读终成器', patternLabel: '梅花纹', patternId: 'plum', themeId: 'floral' },
  { id: 'plum_6', scene: '传统服饰', keywords: ['汉服', '服饰', '衣饰', '绣品'], meaning: '梅开五福，传统服饰上寓意五福临门的纹样', patternLabel: '梅花纹', patternId: 'plum', themeId: 'floral' },
  { id: 'plum_7', scene: '婚礼/成双', keywords: ['婚礼', '新婚', '喜事', '成双'], meaning: '双梅并蒂，寓意喜事成双、情意相投', patternLabel: '梅花纹', patternId: 'plum', themeId: 'floral' },
  { id: 'plum_8', scene: '家居装饰', keywords: ['家居', '装饰', '布置', '挂画'], meaning: '疏影横斜，为家居增添清雅意境', patternLabel: '梅花纹', patternId: 'plum', themeId: 'floral' },
  { id: 'plum_9', scene: '文化礼品', keywords: ['礼品', '送礼', '伴手礼'], meaning: '梅韵高洁，寓意坚韧美好，是风雅的赠礼', patternLabel: '梅花纹', patternId: 'plum', themeId: 'floral' },
  { id: 'plum_10', scene: '冬日/雪景', keywords: ['冬天', '雪景', '踏雪寻梅', '凛冬'], meaning: '踏雪寻梅，寓意冬日雅趣与不屈精神', patternLabel: '梅花纹', patternId: 'plum', themeId: 'floral' },

  // ==================== 兰花纹 ====================
  { id: 'orchid_1', scene: '君子/品德', keywords: ['君子', '品德', '君子如兰', '贤德'], meaning: '兰为君子之花，寓意品性高洁、德行端正', patternLabel: '兰花纹', patternId: 'orchid', themeId: 'floral' },
  { id: 'orchid_2', scene: '高雅/清幽', keywords: ['高雅', '清幽', '幽香', '雅致'], meaning: '空谷幽兰，寓意高雅脱俗、不染尘俗', patternLabel: '兰花纹', patternId: 'orchid', themeId: 'floral' },
  { id: 'orchid_3', scene: '友谊/金兰', keywords: ['友谊', '金兰', '知己', '结拜'], meaning: '义结金兰，寓意情谊深厚、同心同德', patternLabel: '兰花纹', patternId: 'orchid', themeId: 'floral' },
  { id: 'orchid_4', scene: '文房/书斋', keywords: ['文房', '书斋', '书房', '笔墨'], meaning: '兰叶清秀，文人案头的清雅之选', patternLabel: '兰花纹', patternId: 'orchid', themeId: 'floral' },
  { id: 'orchid_5', scene: '毕业/成才', keywords: ['毕业', '成才', '学业', '弟子'], meaning: '芝兰玉树，寓意桃李芬芳、学子成才', patternLabel: '兰花纹', patternId: 'orchid', themeId: 'floral' },
  { id: 'orchid_6', scene: '生日/生辰', keywords: ['生日', '生辰', '庆生'], meaning: '兰蕙同心，寓意福慧双修、清雅安宁', patternLabel: '兰花纹', patternId: 'orchid', themeId: 'floral' },
  { id: 'orchid_7', scene: '家居装饰', keywords: ['家居', '装饰', '布置', '挂画'], meaning: '兰室生香，为家居增添清雅之气', patternLabel: '兰花纹', patternId: 'orchid', themeId: 'floral' },
  { id: 'orchid_8', scene: '传统服饰', keywords: ['汉服', '服饰', '衣饰', '绣品'], meaning: '兰纹清雅，点缀服饰尽显君子之风', patternLabel: '兰花纹', patternId: 'orchid', themeId: 'floral' },
  { id: 'orchid_9', scene: '文化礼品', keywords: ['礼品', '送礼', '伴手礼'], meaning: '君子如兰，寓意高雅美好，是风雅之礼', patternLabel: '兰花纹', patternId: 'orchid', themeId: 'floral' },
  { id: 'orchid_10', scene: '静心/禅意', keywords: ['静心', '禅意', '宁静', '安神'], meaning: '幽兰入室，寓意心静气和、恬淡自适', patternLabel: '兰花纹', patternId: 'orchid', themeId: 'floral' },

  // ==================== 芙蓉花纹 ====================
  { id: 'furong_1', scene: '荣华/富贵', keywords: ['荣华', '富贵', '显达', '锦绣'], meaning: '芙蓉谐音夫荣，寓意荣华富贵、前程锦绣', patternLabel: '芙蓉花纹', patternId: 'furong', themeId: 'floral' },
  { id: 'furong_2', scene: '新婚/婚后', keywords: ['新婚', '婚后', '结婚', '喜事'], meaning: '芙蓉并蒂，寓意夫妻恩爱、家庭美满', patternLabel: '芙蓉花纹', patternId: 'furong', themeId: 'floral' },
  { id: 'furong_3', scene: '姻缘/情缘', keywords: ['姻缘', '情缘', '良缘', '邂逅'], meaning: '芙蓉出水，寓意美好姻缘、清丽动人', patternLabel: '芙蓉花纹', patternId: 'furong', themeId: 'floral' },
  { id: 'furong_4', scene: '女儿/闺秀', keywords: ['女儿', '闺秀', '女子', '红颜'], meaning: '出水芙蓉，寓意女子清丽脱俗、气质温婉', patternLabel: '芙蓉花纹', patternId: 'furong', themeId: 'floral' },
  { id: 'furong_5', scene: '锦上添花', keywords: ['锦上添花', '圆满', '锦程'], meaning: '芙蓉寓意锦上添花，祝愿美好更上层楼', patternLabel: '芙蓉花纹', patternId: 'furong', themeId: 'floral' },
  { id: 'furong_6', scene: '家居装饰', keywords: ['家居', '装饰', '布置', '挂画'], meaning: '芙蓉娇妍，为家居增添明丽温馨之气', patternLabel: '芙蓉花纹', patternId: 'furong', themeId: 'floral' },
  { id: 'furong_7', scene: '传统服饰', keywords: ['汉服', '旗袍', '服饰', '衣饰'], meaning: '芙蓉朵朵，传统服饰上寓意荣华秀丽的纹样', patternLabel: '芙蓉花纹', patternId: 'furong', themeId: 'floral' },
  { id: 'furong_8', scene: '文化礼品', keywords: ['礼品', '送礼', '伴手礼'], meaning: '芙蓉寄意荣华，是寓意美好的馈赠之选', patternLabel: '芙蓉花纹', patternId: 'furong', themeId: 'floral' },
  { id: 'furong_9', scene: '生日/生辰', keywords: ['生日', '生辰', '庆生'], meaning: '芙蓉映日，寓意生活荣光焕发、幸福美满', patternLabel: '芙蓉花纹', patternId: 'furong', themeId: 'floral' },
  { id: 'furong_10', scene: '夏天/赏花', keywords: ['夏天', '夏日', '赏花', '荷塘'], meaning: '芙蓉映水，寓意夏日清凉与明艳之美', patternLabel: '芙蓉花纹', patternId: 'furong', themeId: 'floral' },

  // ==================== 石榴花纹 ====================
  { id: 'pomegranate_flower_1', scene: '多子/人丁', keywords: ['多子', '人丁兴旺', '添丁', '求子'], meaning: '石榴多子，寓意子孙满堂、人丁兴旺', patternLabel: '石榴花纹', patternId: 'pomegranate_flower', themeId: 'floral' },
  { id: 'pomegranate_flower_2', scene: '新婚/早生贵子', keywords: ['新婚', '早生贵子', '结婚', '喜事'], meaning: '榴开百子，祝福新人早生贵子、家业绵延', patternLabel: '石榴花纹', patternId: 'pomegranate_flower', themeId: 'floral' },
  { id: 'pomegranate_flower_3', scene: '家业/传承', keywords: ['家业', '传承', '兴旺', '绵延'], meaning: '榴实累累，寓意家族兴旺、薪火相传', patternLabel: '石榴花纹', patternId: 'pomegranate_flower', themeId: 'floral' },
  { id: 'pomegranate_flower_4', scene: '红火/喜庆', keywords: ['红火', '喜庆', '热闹', '吉庆'], meaning: '榴花似火，寓意日子红火、喜气洋洋', patternLabel: '石榴花纹', patternId: 'pomegranate_flower', themeId: 'floral' },
  { id: 'pomegranate_flower_5', scene: '丰收/收获', keywords: ['丰收', '收获', '硕果', '圆满'], meaning: '榴满枝头，寓意硕果累累、五谷丰登', patternLabel: '石榴花纹', patternId: 'pomegranate_flower', themeId: 'floral' },
  { id: 'pomegranate_flower_6', scene: '文化礼品', keywords: ['礼品', '送礼', '伴手礼'], meaning: '榴开百子寓意美满，是贺喜的吉祥之礼', patternLabel: '石榴花纹', patternId: 'pomegranate_flower', themeId: 'floral' },
  { id: 'pomegranate_flower_7', scene: '传统服饰', keywords: ['汉服', '服饰', '衣饰', '绣品'], meaning: '石榴红艳，传统绣品上寓意多福多子的纹样', patternLabel: '石榴花纹', patternId: 'pomegranate_flower', themeId: 'floral' },
  { id: 'pomegranate_flower_8', scene: '家居装饰', keywords: ['家居', '装饰', '布置', '挂画'], meaning: '榴花似锦，为家居增添红火吉庆之气', patternLabel: '石榴花纹', patternId: 'pomegranate_flower', themeId: 'floral' },
  { id: 'pomegranate_flower_9', scene: '夏日/时节', keywords: ['夏天', '夏日', '五月', '榴月'], meaning: '五月榴花照眼明，寓意夏时之美与生机', patternLabel: '石榴花纹', patternId: 'pomegranate_flower', themeId: 'floral' },
  { id: 'pomegranate_flower_10', scene: '生日/生辰', keywords: ['生日', '生辰', '庆生'], meaning: '榴开百子，寓意生日喜庆、福泽绵长', patternLabel: '石榴花纹', patternId: 'pomegranate_flower', themeId: 'floral' },

  // ==================== 花鸟纹 ====================
  { id: 'flower_bird_1', scene: '生机/和谐', keywords: ['生机', '和谐', '自然', '鸟语花香'], meaning: '鸟语花香，寓意生机盎然、岁月静好', patternLabel: '花鸟纹', patternId: 'flower_bird', themeId: 'floral' },
  { id: 'flower_bird_2', scene: '喜事/报喜', keywords: ['报喜', '喜事', '喜鹊', '佳音'], meaning: '喜鹊登梅，寓意喜事临门、佳音将至', patternLabel: '花鸟纹', patternId: 'flower_bird', themeId: 'floral' },
  { id: 'flower_bird_3', scene: '春天/春意', keywords: ['春天', '春意', '踏青', '迎春'], meaning: '春色满园，寓意春和景明、万象更新', patternLabel: '花鸟纹', patternId: 'flower_bird', themeId: 'floral' },
  { id: 'flower_bird_4', scene: '工笔/雅趣', keywords: ['工笔', '国画', '雅趣', '笔墨'], meaning: '花鸟工笔，国画中最富生趣的雅致纹样', patternLabel: '花鸟纹', patternId: 'flower_bird', themeId: 'floral' },
  { id: 'flower_bird_5', scene: '家居装饰', keywords: ['家居', '装饰', '挂画', '布置'], meaning: '花鸟图卷，为家居增添灵秀雅致之气', patternLabel: '花鸟纹', patternId: 'flower_bird', themeId: 'floral' },
  { id: 'flower_bird_6', scene: '传统服饰', keywords: ['汉服', '旗袍', '服饰', '衣饰'], meaning: '花鸟绣纹，传统服饰上寓意吉庆的经典纹样', patternLabel: '花鸟纹', patternId: 'flower_bird', themeId: 'floral' },
  { id: 'flower_bird_7', scene: '文化礼品', keywords: ['礼品', '送礼', '伴手礼'], meaning: '花鸟寄情，寓意美好安宁，是雅致的赠礼', patternLabel: '花鸟纹', patternId: 'flower_bird', themeId: 'floral' },
  { id: 'flower_bird_8', scene: '新婚/美满', keywords: ['婚礼', '新婚', '成双', '美满'], meaning: '双鸟栖枝，寓意比翼双飞、恩爱美满', patternLabel: '花鸟纹', patternId: 'flower_bird', themeId: 'floral' },
  { id: 'flower_bird_9', scene: '祝寿/延年', keywords: ['祝寿', '延年', '长寿', '寿辰'], meaning: '绶带鸟衔芝，寓意福寿绵长、健康延年', patternLabel: '花鸟纹', patternId: 'flower_bird', themeId: 'floral' },
  { id: 'flower_bird_10', scene: '书房/文雅', keywords: ['书房', '文房', '文雅', '雅室'], meaning: '鸟语花韵，为书房增添闲雅意趣', patternLabel: '花鸟纹', patternId: 'flower_bird', themeId: 'floral' },

  // ==================== 缠枝花纹 ====================
  { id: 'interlocking_floral_1', scene: '绵延/长久', keywords: ['绵延', '长久', '连绵不断', '生生不息'], meaning: '缠枝连绵不断，寓意生生不息、福泽绵长', patternLabel: '缠枝花纹', patternId: 'interlocking_floral', themeId: 'floral' },
  { id: 'interlocking_floral_2', scene: '家族/传承', keywords: ['家族', '传承', '香火', '绵延'], meaning: '藤蔓缠绕相生，寓意家族兴旺、代代相传', patternLabel: '缠枝花纹', patternId: 'interlocking_floral', themeId: 'floral' },
  { id: 'interlocking_floral_3', scene: '婚礼/爱情', keywords: ['婚礼', '爱情', '缠缠绵绵', '长久'], meaning: '枝蔓相依，寓意爱情缠绵、长长久久', patternLabel: '缠枝花纹', patternId: 'interlocking_floral', themeId: 'floral' },
  { id: 'interlocking_floral_4', scene: '家居装饰', keywords: ['家居', '装饰', '壁纸', '布艺'], meaning: '缠枝连贯流畅，是家居布艺的经典连续纹样', patternLabel: '缠枝花纹', patternId: 'interlocking_floral', themeId: 'floral' },
  { id: 'interlocking_floral_5', scene: '瓷器/青花', keywords: ['瓷器', '青花', '陶瓷', '瓶'], meaning: '青花缠枝，中国瓷器上最经典的吉祥纹样', patternLabel: '缠枝花纹', patternId: 'interlocking_floral', themeId: 'floral' },
  { id: 'interlocking_floral_6', scene: '织锦/刺绣', keywords: ['织锦', '刺绣', '布艺', '面料'], meaning: '缠枝纹样连绵，适合织锦刺绣的连续构图', patternLabel: '缠枝花纹', patternId: 'interlocking_floral', themeId: 'floral' },
  { id: 'interlocking_floral_7', scene: '传统服饰', keywords: ['汉服', '服饰', '衣饰', '绣品'], meaning: '缠枝华美，点缀服饰寓意绵延富贵', patternLabel: '缠枝花纹', patternId: 'interlocking_floral', themeId: 'floral' },
  { id: 'interlocking_floral_8', scene: '新年/春节', keywords: ['新年', '春节', '过年', '吉庆'], meaning: '万代长春，寓意新年福运绵延不断', patternLabel: '缠枝花纹', patternId: 'interlocking_floral', themeId: 'floral' },
  { id: 'interlocking_floral_9', scene: '文化礼品', keywords: ['礼品', '送礼', '伴手礼'], meaning: '缠枝寓意长久，是祝福绵延的雅致之礼', patternLabel: '缠枝花纹', patternId: 'interlocking_floral', themeId: 'floral' },
  { id: 'interlocking_floral_10', scene: '祈福/平安', keywords: ['祈福', '平安', '顺遂', '康宁'], meaning: '枝蔓延绵，寓意福气源源不断、岁岁平安', patternLabel: '缠枝花纹', patternId: 'interlocking_floral', themeId: 'floral' },

  // ==================== 葫芦纹 ====================
  { id: 'gourd_1', scene: '福禄/吉祥', keywords: ['福禄', '福气', '吉祥', '纳福'], meaning: '葫芦谐音福禄，寓意福禄双全、吉祥如意', patternLabel: '葫芦纹', patternId: 'gourd', themeId: 'floral' },
  { id: 'gourd_2', scene: '辟邪/保平安', keywords: ['辟邪', '保平安', '护身', '镇宅'], meaning: '葫芦能收邪祟，寓意驱邪纳福、平安顺遂', patternLabel: '葫芦纹', patternId: 'gourd', themeId: 'floral' },
  { id: 'gourd_3', scene: '多子/繁衍', keywords: ['多子', '繁衍', '子孙', '葫芦娃'], meaning: '葫芦藤蔓多籽，寓意多子多福、家族繁衍', patternLabel: '葫芦纹', patternId: 'gourd', themeId: 'floral' },
  { id: 'gourd_4', scene: '升官/禄位', keywords: ['升官', '禄位', '仕途', '功名'], meaning: '葫芦寓禄，祝愿仕途亨通、加官进爵', patternLabel: '葫芦纹', patternId: 'gourd', themeId: 'floral' },
  { id: 'gourd_5', scene: '婚嫁/传家', keywords: ['婚嫁', '传家', '子孙后代', '香火'], meaning: '葫芦连枝，寓意子孙昌盛、代代相传', patternLabel: '葫芦纹', patternId: 'gourd', themeId: 'floral' },
  { id: 'gourd_6', scene: '居家/纳福', keywords: ['居家', '纳福', '挂饰', '摆设'], meaning: '葫芦挂福，是居家纳福的常见吉祥挂饰', patternLabel: '葫芦纹', patternId: 'gourd', themeId: 'floral' },
  { id: 'gourd_7', scene: '传统服饰', keywords: ['汉服', '服饰', '衣饰', '绣品'], meaning: '葫芦纹样圆润饱满，点缀服饰寓意福禄', patternLabel: '葫芦纹', patternId: 'gourd', themeId: 'floral' },
  { id: 'gourd_8', scene: '文化礼品', keywords: ['礼品', '送礼', '伴手礼'], meaning: '福禄葫芦，寓意福禄双全，是讨喜的赠礼', patternLabel: '葫芦纹', patternId: 'gourd', themeId: 'floral' },
  { id: 'gourd_9', scene: '新年/春节', keywords: ['新年', '春节', '过年', '迎春'], meaning: '福禄临门，寓意新年福运亨通、喜气盈门', patternLabel: '葫芦纹', patternId: 'gourd', themeId: 'floral' },
  { id: 'gourd_10', scene: '乔迁/新居', keywords: ['乔迁', '新居', '搬家', '入宅'], meaning: '福禄入宅，寓意新居平安富贵、福气满堂', patternLabel: '葫芦纹', patternId: 'gourd', themeId: 'floral' },
]

/** 根据关键词做包含匹配，返回命中的语义记录（按场景分组去重） */
export function searchCulturalSemantics(query: string): CulturalSemantic[] {
  const q = query.trim()
  if (!q) return []
  const seen = new Set<string>()
  const results: CulturalSemantic[] = []
  for (const item of CULTURAL_SEMANTICS) {
    const hit = item.keywords.some((kw) => q.includes(kw))
    if (hit && !seen.has(item.patternId + item.scene)) {
      seen.add(item.patternId + item.scene)
      results.push(item)
    }
  }
  return results
}

/** 使用场景选项：展示名 + 场景提示文案 */
export interface SceneOption {
  id: string
  label: string
  promptHint: string
}

/**
 * 同义场景归并表：语义表 scene 原始值 → 标准场景 id（id 稳定，跨页/跨版本不变）。
 * 列表从 CULTURAL_SEMANTICS 的 scene 字段自动去重生成，此处只负责「合并同义」。
 */
export const SCENE_ALIAS: Record<string, string> = {
  // 毕业 / 升学
  '毕业/升学': 'graduation',
  '毕业/成才': 'graduation',
  '学业/中举': 'graduation',
  '励志/求学': 'graduation',
  // 婚礼 / 婚恋（含婚庆相关细分）
  '婚礼/新婚': 'wedding',
  '婚恋/爱情': 'wedding',
  '爱情/伴侣': 'wedding',
  '婚礼/成双': 'wedding',
  '新婚/婚庆': 'wedding',
  '新婚/婚后': 'wedding',
  '婚礼/爱情': 'wedding',
  '新婚/美满': 'wedding',
  '订婚/良缘': 'wedding',
  '婚礼请柬': 'wedding',
  '嫁妆/陪嫁': 'wedding',
  '婚房布置': 'wedding',
  '婚礼回礼': 'wedding',
  '新婚/早生贵子': 'wedding',
  '姻缘/情缘': 'wedding',
  '婚嫁/传家': 'wedding',
  // 寿辰 / 生辰
  '寿辰/祝寿': 'longevity',
  '长辈寿辰': 'longevity',
  '祝寿/延年': 'longevity',
  '重阳节': 'longevity',
  '生日/生辰': 'birthday',
  // 开业 / 创业 / 仕途
  '开业/升职': 'opening',
  '开业/庆典': 'opening',
  '开业/开张': 'opening',
  '创业/开疆': 'venture',
  '开疆/创业': 'venture',
  '事业/腾飞': 'venture',
  '仕途/功名': 'career',
  '升职/高升': 'career',
  '功名利禄': 'career',
  '升官/禄位': 'career',
  '太狮少狮': 'career',
  // 乔迁 / 新居
  '乔迁/新居': 'housewarming',
  '居家/纳福': 'housewarming',
  // 新春 / 庆典
  '新年/春节': 'newyear',
  '春季节庆': 'newyear',
  '报春/新生': 'newyear',
  '节日庆典': 'festival',
  '节庆/盛宴': 'festival',
  '节日/庆典': 'festival',
  '喜庆/热闹': 'festival',
  '端午/龙舟': 'festival',
  // 礼赠 / 文创周边
  '文化礼品': 'cultural',
  '长辈馈赠': 'cultural',
  // 服饰 / 家居
  '传统服饰': 'apparel',
  '家居装饰': 'home',
  // 护佑 / 辟邪
  '镇宅/祈福': 'protection',
  '护佑/辟邪': 'protection',
  '辟邪/镇宅': 'protection',
  '辟邪/保平安': 'protection',
  '祈福/平安': 'protection',
  '中元/祈福': 'protection',
  // 富贵 / 繁荣
  '富贵/繁荣': 'prosperity',
  '富贵/荣华': 'prosperity',
  '荣华/富贵': 'prosperity',
  '福禄双全': 'prosperity',
  '福禄/吉祥': 'prosperity',
  '锦上添花': 'prosperity',
  '红火/喜庆': 'prosperity',
  // 文人雅趣 / 雅集
  '文人雅趣': 'elegance',
  '文人/雅士': 'elegance',
  '文人/四君子': 'elegance',
  '文房/书斋': 'elegance',
  '书房/文雅': 'elegance',
  '工笔/雅趣': 'elegance',
  '高雅/清幽': 'elegance',
  '君子/品德': 'elegance',
  '高洁/雅士': 'elegance',
  // 少女 / 女儿
  '少女/闺秀': 'daughter',
  '女儿/闺秀': 'daughter',
  '女儿/嫁娶': 'daughter',
  // 童趣 / 成人礼 / 生肖
  '童趣/虎头': 'children',
  '童趣/玩偶': 'children',
  '成年礼/加冠': 'coming_of_age',
  '生肖/本命年': 'zodiac',
  // 勇武 / 尊贵
  '勇武/气魄': 'valor',
  '军人/武职': 'valor',
  '勇猛/守护': 'valor',
  '尊贵/高雅': 'noble',
  '尊贵/权威': 'noble',
  '男子/顶梁': 'noble',
  '中和/平衡': 'noble',
  // 自然 / 四季
  '山林/自然': 'nature',
  '春天/踏青': 'nature',
  '春天/春意': 'nature',
  '夏日/清凉': 'nature',
  '夏日/时节': 'nature',
  '夏天/赏花': 'nature',
  '秋日/丰收': 'nature',
  '丰收/收获': 'nature',
  '冬日/雪景': 'nature',
  // 家业 / 传承
  '多子/人丁': 'family',
  '多子/繁衍': 'family',
  '家业/传承': 'family',
  '家族/传承': 'family',
  '绵延/长久': 'family',
  // 静心 / 禅意
  '宁静养生': 'zen',
  '静心/禅意': 'zen',
  '宗教/禅意': 'zen',
  // 清廉 / 坚韧
  '纯洁/清廉': 'integrity',
  '隐逸/淡泊': 'integrity',
  '坚贞/傲骨': 'integrity',
  '坚韧/傲骨': 'integrity',
  // 其他
  '友谊/金兰': 'friendship',
  '母亲/感恩': 'gratitude',
  '喜事/报喜': 'joy',
  '生机/和谐': 'joy',
  '瓷器/青花': 'craft',
  '织锦/刺绣': 'craft',
  '建筑/雕梁': 'craft',
  '建筑/石雕': 'craft',
}

/** 标准场景 id → 展示名 + 场景提示文案（未列出的场景自动用语义表寓意兜底） */
const SCENE_META: Record<string, { label: string; hint?: string }> = {
  graduation: { label: '毕业', hint: '寓意成长与高升；宜用鹤、梅、牡丹等；色调明快，适合礼品与书签。' },
  wedding: { label: '婚礼', hint: '寓意喜庆成双；宜用龙凤、牡丹、莲花；红金或柔和配色。' },
  longevity: { label: '寿辰', hint: '寓意长寿康宁；宜用鹤、鹿、桃、松；沉稳雅致。' },
  birthday: { label: '生辰', hint: '寓意庆生纳福；宜用牡丹、石榴、蝴蝶；明快喜庆。' },
  opening: { label: '开业', hint: '寓意开业兴隆；宜用凤鸟、狮子、牡丹；红金配色显热闹。' },
  venture: { label: '创业', hint: '寓意事业腾飞；宜用龙、虎、鹿；气势昂扬。' },
  career: { label: '仕途', hint: '寓意功名亨通；宜用鹿、孔雀、鹤；端庄贵气。' },
  housewarming: { label: '乔迁', hint: '寓意新居纳福；宜用凤鸟、鹿、葫芦、缠枝；温馨吉庆。' },
  newyear: { label: '新春', hint: '寓意新春吉庆；宜用龙、凤、梅、虎；红金喜庆。' },
  festival: { label: '庆典', hint: '寓意隆重热闹；宜用龙凤、狮子、孔雀；华美大气。' },
  cultural: { label: '文创周边', hint: '适合手机壳、帆布包、礼盒等；主体清晰、背景干净。' },
  apparel: { label: '服饰', hint: '适合面料与绣片；注意边缘完整与对称。' },
  home: { label: '家居', hint: '装饰性强、可连续铺陈；宜团花、缠枝；色调和谐。' },
  protection: { label: '护佑', hint: '寓意镇宅护佑；宜用虎、龙、狮子、葫芦；稳重有威。' },
  prosperity: { label: '富贵', hint: '寓意富贵繁荣；宜用牡丹、孔雀、石榴；华丽丰盛。' },
  elegance: { label: '雅集', hint: '寓意文人雅趣；宜用梅兰竹菊、鹤、莲；清雅含蓄。' },
  daughter: { label: '少女礼', hint: '寓意少女美好；宜用蝴蝶、芙蓉、石榴花；柔美灵动。' },
  children: { label: '童趣', hint: '寓意孩童守护；宜用虎头、狮、蝴蝶；可爱生动。' },
  coming_of_age: { label: '成人礼', hint: '寓意长大成才；宜用虎、龙、凤；精神昂扬。' },
  zodiac: { label: '生肖', hint: '寓意本命年护佑；宜用对应生肖纹样；生动有趣。' },
  valor: { label: '勇武', hint: '寓意勇武气魄；宜用虎、狮、龙；刚健有力。' },
  noble: { label: '尊贵', hint: '寓意尊贵权威；宜用龙、凤、孔雀；雍容华贵。' },
  nature: { label: '自然四季', hint: '寓意自然生机；宜用花鸟、蝴蝶、菊梅；清新明快。' },
  family: { label: '家业传承', hint: '寓意子孙绵延、家业兴旺；宜用石榴、葫芦、缠枝。' },
  zen: { label: '静心禅意', hint: '寓意宁静祥和；宜用莲、鹤、兰；素雅沉静。' },
  integrity: { label: '清廉高洁', hint: '寓意清正高洁；宜用莲、兰、梅；淡雅端正。' },
  friendship: { label: '友谊金兰', hint: '寓意情谊相投；宜用兰、鹤、梅；清雅隽永。' },
  gratitude: { label: '感恩', hint: '寓意感恩敬重；宜用牡丹、鹤、兰；温暖真诚。' },
  joy: { label: '喜事报喜', hint: '寓意喜事临门；宜用花鸟、喜鹊、牡丹；欢快明亮。' },
  craft: { label: '工艺雅器', hint: '适用于瓷器、织绣、建筑装饰；宜缠枝、花鸟、龙凤。' },
}

/** 语义表 scene 原始值 → 标准场景 id（未归并的值原样返回） */
export function sceneToSceneId(scene: string): string {
  return SCENE_ALIAS[scene] ?? scene
}

/** 从语义表 scene 字段自动去重生成「使用场景」选项 */
function buildSceneOptions(): SceneOption[] {
  const seen = new Set<string>()
  const options: SceneOption[] = []
  for (const s of CULTURAL_SEMANTICS) {
    const id = sceneToSceneId(s.scene)
    if (seen.has(id)) continue
    seen.add(id)
    const meta = SCENE_META[id]
    options.push({
      id,
      label: meta?.label ?? s.scene.split('/')[0],
      promptHint: meta?.hint ?? s.meaning,
    })
  }
  return options
}

export const SCENE_OPTIONS: SceneOption[] = buildSceneOptions()

/** 标准场景 id → 触发关键词（自动汇总语义表 keywords + 场景名，供自然语言解析场景使用） */
export const SCENE_KEYWORDS: Record<string, string[]> = (() => {
  const map: Record<string, Set<string>> = {}
  for (const s of CULTURAL_SEMANTICS) {
    const id = sceneToSceneId(s.scene)
    const set = (map[id] ??= new Set<string>())
    set.add(s.scene)
    for (const kw of s.keywords) set.add(kw)
  }
  return Object.fromEntries(Object.entries(map).map(([k, v]) => [k, [...v]]))
})()
