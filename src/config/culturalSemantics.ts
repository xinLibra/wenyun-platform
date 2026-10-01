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
 *   - themeId      所属主题（floral / geometric）
 *
 * 主题：花卉 + 几何（回纹 / 盘长纹 / 锦地纹 / 方胜纹）。瑞兽相关已全部移除。
 */
export interface CulturalSemantic {
  id: string
  scene: string
  keywords: string[]
  meaning: string
  patternLabel: string
  patternId: string
  themeId: 'floral' | 'geometric'
}

/** 匹配命中强度：关键词命中的权重 */
export const SEMANTIC_MATCH_WEIGHT = 10

export const CULTURAL_SEMANTICS: CulturalSemantic[] = [
  // ==================== 回纹 ====================
  { id: 'huiwen_1', scene: '毕业/升学', keywords: ['毕业', '升学', '学业', '成才', '学有所成', '成长'], meaning: '回环往复、学无止境，寓意学业连续进取', patternLabel: '回纹', patternId: 'huiwen', themeId: 'geometric' },
  { id: 'huiwen_2', scene: '励志/求学', keywords: ['励志', '求学', '苦读', '寒窗'], meaning: '回纹循环往复，寓意持之以恒、终有所成', patternLabel: '回纹', patternId: 'huiwen', themeId: 'geometric' },
  { id: 'huiwen_3', scene: '新年/春节', keywords: ['新年', '春节', '过年', '迎春', '包装', '礼盒'], meaning: '回纹连绵不断、周而复始，新春纳福', patternLabel: '回纹', patternId: 'huiwen', themeId: 'geometric' },
  { id: 'huiwen_4', scene: '文化礼品', keywords: ['礼品', '伴手礼', '文创', '纪念品', '赠礼'], meaning: '回纹简洁耐看，书签、文创周边经典之选', patternLabel: '回纹', patternId: 'huiwen', themeId: 'geometric' },
  { id: 'huiwen_5', scene: '国风/非遗', keywords: ['国风', '传统', '非遗', '文化', '展览'], meaning: '经典几何非遗感，寓意文化传承、源远流长', patternLabel: '回纹', patternId: 'huiwen', themeId: 'geometric' },
  { id: 'huiwen_6', scene: '现代/极简', keywords: ['极简', '现代', '线条', '黑白', '冷淡', '简约'], meaning: '干净利落的几何美，回纹线描疏朗耐看', patternLabel: '回纹', patternId: 'huiwen', themeId: 'geometric' },
  { id: 'huiwen_7', scene: '家居装饰', keywords: ['家居', '装饰', '布置', '挂画'], meaning: '回纹窗棂、几何装饰，为家居增添雅致', patternLabel: '回纹', patternId: 'huiwen', themeId: 'geometric' },
  { id: 'huiwen_8', scene: '传统服饰', keywords: ['汉服', '服饰', '衣饰', '绣品'], meaning: '回纹织带、服饰缘边，传统服饰经典边饰', patternLabel: '回纹', patternId: 'huiwen', themeId: 'geometric' },
  { id: 'huiwen_9', scene: '底纹/满铺', keywords: ['连续', '底纹', '纹理', '布料', '满铺'], meaning: '回纹四方连续，回环往复适合满铺底纹', patternLabel: '回纹', patternId: 'huiwen', themeId: 'geometric' },
  { id: 'huiwen_10', scene: '友谊/金兰', keywords: ['友谊', '金兰', '知己', '情谊'], meaning: '回纹回环，寓意情谊绵长、往来不息', patternLabel: '回纹', patternId: 'huiwen', themeId: 'geometric' },
  { id: 'huiwen_11', scene: '乔迁/新居', keywords: ['乔迁', '新居', '搬家', '入宅'], meaning: '回纹回环连绵，寓意新居绵长顺遂、好运流转', patternLabel: '回纹', patternId: 'huiwen', themeId: 'geometric' },

  // ==================== 盘长纹 ====================
  { id: 'panchang_1', scene: '婚礼/新婚', keywords: ['婚礼', '新婚', '结婚', '喜事', '婚庆', '百年', '喜庆'], meaning: '盘长连绵不断，寓意长长久久、白头偕老', patternLabel: '盘长纹', patternId: 'panchang', themeId: 'geometric' },
  { id: 'panchang_2', scene: '订婚/良缘', keywords: ['订婚', '良缘', '定亲', '求婚', '提亲'], meaning: '盘长无终无始，寓意缘分绵长、佳偶天成', patternLabel: '盘长纹', patternId: 'panchang', themeId: 'geometric' },
  { id: 'panchang_3', scene: '新年/春节', keywords: ['新年', '春节', '年货', '礼盒', '过年'], meaning: '盘长吉庆、礼序井然，新春纳福长长久久', patternLabel: '盘长纹', patternId: 'panchang', themeId: 'geometric' },
  { id: 'panchang_4', scene: '节日庆典', keywords: ['节庆', '庆典', '宴会', '吉庆', '盛典'], meaning: '盘长为八吉祥之一，寓意吉庆祥和、福缘绵长', patternLabel: '盘长纹', patternId: 'panchang', themeId: 'geometric' },
  { id: 'panchang_5', scene: '婚礼请柬', keywords: ['请柬', '喜帖', '喜糖', '礼盒'], meaning: '盘长经典婚庆纹样，连绵寓意美好祝福', patternLabel: '盘长纹', patternId: 'panchang', themeId: 'geometric' },
  { id: 'panchang_6', scene: '宗教/禅意', keywords: ['禅意', '佛系', '修行', '净心'], meaning: '盘长为八吉祥之一，寓意圆满智慧、清净庄严', patternLabel: '盘长纹', patternId: 'panchang', themeId: 'geometric' },
  { id: 'panchang_7', scene: '文创周边', keywords: ['文创', '纪念品', '手机壳', '书签'], meaning: '盘长结构完整，适合居中单纹样与文创周边', patternLabel: '盘长纹', patternId: 'panchang', themeId: 'geometric' },
  { id: 'panchang_8', scene: 'logo/徽章', keywords: ['徽章', '居中', 'logo', '图标', '单独'], meaning: '盘长对称完整，适合徽章、居中单纹样', patternLabel: '盘长纹', patternId: 'panchang', themeId: 'geometric' },
  { id: 'panchang_9', scene: '寿辰/祝寿', keywords: ['寿辰', '祝寿', '寿宴', '延年'], meaning: '盘长福寿绵长，寓意福气连绵、长寿安康', patternLabel: '盘长纹', patternId: 'panchang', themeId: 'geometric' },
  { id: 'panchang_10', scene: '生日/生辰', keywords: ['生日', '生辰', '庆生'], meaning: '盘长福缘绵长，寓意岁岁福气相连', patternLabel: '盘长纹', patternId: 'panchang', themeId: 'geometric' },
  { id: 'panchang_11', scene: '商务/会议', keywords: ['商务', '会议', '办公', '商谈', '职场'], meaning: '盘长绵长无断，寓意商务合作长久顺遂', patternLabel: '盘长纹', patternId: 'panchang', themeId: 'geometric' },
  { id: 'panchang_12', scene: '国风/非遗', keywords: ['国风', '非遗', '展览', '文化', '传统'], meaning: '盘长为八吉祥之一，经典非遗纹样，寓意文化传承福缘绵长', patternLabel: '盘长纹', patternId: 'panchang', themeId: 'geometric' },

  // ==================== 锦地纹 ====================
  { id: 'jindi_1', scene: '乔迁/新居', keywords: ['乔迁', '新居', '搬家', '入宅', '新房'], meaning: '满铺底纹、典雅体面，寓意新居锦绣盈门', patternLabel: '锦地纹', patternId: 'jindi', themeId: 'geometric' },
  { id: 'jindi_2', scene: '家居装饰', keywords: ['家居', '装修', '客厅', '装饰', '布置'], meaning: '锦地满铺、典雅体面，为客厅家居添锦绣', patternLabel: '锦地纹', patternId: 'jindi', themeId: 'geometric' },
  { id: 'jindi_3', scene: '底纹/满铺', keywords: ['连续', '底纹', '纹理', '布料', '满铺'], meaning: '锦地最适合四方连续，满铺底纹优雅耐看', patternLabel: '锦地纹', patternId: 'jindi', themeId: 'geometric' },
  { id: 'jindi_4', scene: '国风/非遗', keywords: ['国风', '传统', '非遗', '文化', '展览'], meaning: '经典几何非遗感，锦地典雅承载文化底蕴', patternLabel: '锦地纹', patternId: 'jindi', themeId: 'geometric' },
  { id: 'jindi_5', scene: '文创周边', keywords: ['手机壳', '书签', '托特包', '抱枕', '文创'], meaning: '锦地是产品定制常用的几何底纹，百搭耐看', patternLabel: '锦地纹', patternId: 'jindi', themeId: 'geometric' },
  { id: 'jindi_6', scene: '富贵/繁荣', keywords: ['富贵', '繁荣', '昌盛', '锦绣'], meaning: '锦上添花、锦绣前程，寓意繁荣昌盛', patternLabel: '锦地纹', patternId: 'jindi', themeId: 'geometric' },
  { id: 'jindi_7', scene: '传统服饰', keywords: ['汉服', '服饰', '衣饰', '织锦'], meaning: '锦地满铺织锦，传统服饰经典底纹', patternLabel: '锦地纹', patternId: 'jindi', themeId: 'geometric' },
  { id: 'jindi_8', scene: '现代/极简', keywords: ['极简', '现代', '线条', '黑白', '冷淡'], meaning: '几何疏朗，锦地极简风格同样出彩', patternLabel: '锦地纹', patternId: 'jindi', themeId: 'geometric' },
  { id: 'jindi_9', scene: '新年/春节', keywords: ['新年', '春节', '年货', '迎春'], meaning: '锦绣盈门，寓意新春富丽吉祥', patternLabel: '锦地纹', patternId: 'jindi', themeId: 'geometric' },
  { id: 'jindi_10', scene: '文化礼品', keywords: ['礼品', '赠礼', '伴手礼', '礼盒'], meaning: '锦地典雅体面，是寓意美好的赠礼之选', patternLabel: '锦地纹', patternId: 'jindi', themeId: 'geometric' },

  // ==================== 方胜纹 ====================
  { id: 'fangsheng_1', scene: '商务/会议', keywords: ['商务', '会议', '职场', '办公', '商谈'], meaning: '方正吉祥、得胜寓意，商务体面之选', patternLabel: '方胜纹', patternId: 'fangsheng', themeId: 'geometric' },
  { id: 'fangsheng_2', scene: '文化礼品', keywords: ['礼品', '赠礼', '伴手礼', '礼盒', '送礼'], meaning: '方胜方正吉祥、得胜寓意，体面大气的赠礼', patternLabel: '方胜纹', patternId: 'fangsheng', themeId: 'geometric' },
  { id: 'fangsheng_3', scene: '新年/春节', keywords: ['新年', '春节', '年货', '礼盒', '过年'], meaning: '方胜节庆礼序，寓意吉祥得胜、福运临门', patternLabel: '方胜纹', patternId: 'fangsheng', themeId: 'geometric' },
  { id: 'fangsheng_4', scene: '开业/开张', keywords: ['开业', '开张', '生意', '兴隆'], meaning: '得胜寓意，祝开业大吉、旗开得胜', patternLabel: '方胜纹', patternId: 'fangsheng', themeId: 'geometric' },
  { id: 'fangsheng_5', scene: '仕途/功名', keywords: ['仕途', '功名', '升职', '晋升', '事业'], meaning: '方胜得胜，寓意仕途顺遂、步步取胜', patternLabel: '方胜纹', patternId: 'fangsheng', themeId: 'geometric' },
  { id: 'fangsheng_6', scene: '现代/极简', keywords: ['极简', '现代', '线条', '黑白', '冷淡'], meaning: '干净几何，方胜双菱叠合现代感强', patternLabel: '方胜纹', patternId: 'fangsheng', themeId: 'geometric' },
  { id: 'fangsheng_7', scene: 'logo/徽章', keywords: ['徽章', '居中', 'logo', '图标', '单独'], meaning: '方胜单独/居中，适合单纹样与徽章标识', patternLabel: '方胜纹', patternId: 'fangsheng', themeId: 'geometric' },
  { id: 'fangsheng_8', scene: '文创周边', keywords: ['手机壳', '托特包', '抱枕', '书签'], meaning: '方胜是产品定制常用几何，方正耐看', patternLabel: '方胜纹', patternId: 'fangsheng', themeId: 'geometric' },
  { id: 'fangsheng_9', scene: '国风/非遗', keywords: ['国风', '传统', '非遗', '文化'], meaning: '经典几何，方胜承载传统吉祥寓意', patternLabel: '方胜纹', patternId: 'fangsheng', themeId: 'geometric' },
  { id: 'fangsheng_10', scene: '乔迁/新居', keywords: ['乔迁', '新居', '搬家', '入宅'], meaning: '方胜纳福，寓意新居方正吉祥、得胜安居', patternLabel: '方胜纹', patternId: 'fangsheng', themeId: 'geometric' },
  { id: 'fangsheng_11', scene: '毕业/升学', keywords: ['毕业', '升学', '学业', '成长'], meaning: '方胜得胜，寓意学业步步取胜、旗开得胜', patternLabel: '方胜纹', patternId: 'fangsheng', themeId: 'geometric' },
  { id: 'fangsheng_12', scene: '婚礼/新婚', keywords: ['婚礼', '新婚', '喜庆', '百年好合', '同心'], meaning: '方胜同心同德、成双成对，寓意姻缘得胜圆满', patternLabel: '方胜纹', patternId: 'fangsheng', themeId: 'geometric' },
  { id: 'fangsheng_13', scene: '底纹/满铺', keywords: ['底纹', '满铺', '布料', '墙纸', '连续'], meaning: '方胜四方连续、疏朗有序，适合满铺底纹', patternLabel: '方胜纹', patternId: 'fangsheng', themeId: 'geometric' },

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
]

/** 根据关键词做包含匹配，返回命中的语义记录（按场景分组去重） */
export function searchCulturalSemantics(query: string): CulturalSemantic[] {
  const q = query.trim()
  if (!q) return []
  const seen = new Set<string>()
  const results: CulturalSemantic[] = []
  for (const item of CULTURAL_SEMANTICS) {
    const sceneId = sceneToSceneId(item.scene)
    const sceneMeta = SCENE_META[sceneId]
    const hit = item.keywords.some((kw) => q.includes(kw))
      || q.includes(item.scene)
      || Boolean(sceneMeta?.label && q.includes(sceneMeta.label))
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
  // 寿辰 / 生辰
  '寿辰/祝寿': 'longevity',
  '长寿/康宁': 'longevity',
  '长辈寿辰': 'longevity',
  '祝寿/延年': 'longevity',
  '重阳节': 'longevity',
  '生日/生辰': 'birthday',
  '长寿': 'longevity',
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
  // 乔迁 / 新居
  '乔迁/新居': 'housewarming',
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
  '文创周边': 'cultural',
  '长辈馈赠': 'cultural',
  // 服饰 / 家居
  '传统服饰': 'apparel',
  '服饰与面料': 'apparel',
  '家居装饰': 'home',
  // 护佑 / 祈福
  '镇宅/祈福': 'protection',
  '护佑/辟邪': 'protection',
  '辟邪/镇宅': 'protection',
  '中元/祈福': 'protection',
  // 富贵 / 繁荣
  '富贵/繁荣': 'prosperity',
  '富贵/荣华': 'prosperity',
  '荣华/富贵': 'prosperity',
  '福禄双全': 'prosperity',
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
  // 童趣 / 成人礼
  '童趣/虎头': 'children',
  '童趣/玩偶': 'children',
  '成年礼/加冠': 'coming_of_age',
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
  '家业/传承': 'family',
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
  '建筑/雕梁': 'craft',
  '建筑/石雕': 'craft',
  // ===== 几何新增场景 =====
  '国风/非遗': 'heritage',
  '现代/极简': 'minimalist',
  '底纹/满铺': 'textile',
  'logo/徽章': 'emblem',
  '商务/会议': 'business',
}

/**
 * 将较细的语义场景归并到少量常用入口。
 * 关键词表仍完整保留，因此自然语言解析能力不减少，只精简页面上的可选项。
 */
const SCENE_COMPACT_GROUP: Record<string, string> = {
  birthday: 'longevity',
  festival: 'newyear',
  joy: 'newyear',
  opening: 'business',
  venture: 'business',
  career: 'business',
  family: 'prosperity',
  daughter: 'cultural',
  children: 'cultural',
  coming_of_age: 'graduation',
  friendship: 'cultural',
  gratitude: 'cultural',
  protection: 'zen',
  integrity: 'elegance',
  craft: 'heritage',
  minimalist: 'heritage',
  textile: 'home',
  emblem: 'cultural',
}

/** 标准场景 id → 展示名 + 场景提示文案（未列出的场景自动用语义表寓意兜底） */
const SCENE_META: Record<string, { label: string; hint?: string }> = {
  graduation: { label: '毕业', hint: '寓意成长与高升；宜用梅、牡丹、回纹等；色调明快，适合礼品与书签。' },
  wedding: { label: '婚礼', hint: '寓意喜庆成双；宜用盘长、牡丹、莲花；红金或柔和配色。' },
  longevity: { label: '寿辰', hint: '寓意长寿康宁；宜用盘长、菊、梅、松；沉稳雅致。' },
  birthday: { label: '生辰', hint: '寓意庆生纳福；宜用牡丹、石榴、盘长；明快喜庆。' },
  opening: { label: '开业', hint: '寓意开业兴隆；宜用方胜、牡丹；红金配色显热闹。' },
  venture: { label: '创业', hint: '寓意事业腾飞；宜用方胜、回纹；气势昂扬。' },
  career: { label: '仕途', hint: '寓意功名亨通；宜用方胜、兰；端庄贵气。' },
  housewarming: { label: '乔迁', hint: '寓意新居纳福；宜用锦地、牡丹、莲；温馨吉庆。' },
  newyear: { label: '新春庆典', hint: '寓意新春与节庆吉祥；宜用盘长、方胜、梅、牡丹；配色明快喜庆。' },
  festival: { label: '庆典', hint: '寓意隆重热闹；宜用盘长、方胜、牡丹；华美大气。' },
  cultural: { label: '文创礼赠', hint: '适合手机壳、帆布包、礼盒与纪念品等；主体清晰、背景干净。' },
  apparel: { label: '服饰', hint: '适合面料与绣片；注意边缘完整与对称。' },
  home: { label: '家居', hint: '装饰性强、可连续铺陈；宜锦地、回纹、牡丹、莲花；色调和谐。' },
  protection: { label: '护佑', hint: '寓意镇宅护佑；宜用方胜、回纹；稳重有威。' },
  prosperity: { label: '富贵家业', hint: '寓意富贵繁荣、家业绵延；宜用牡丹、锦地、石榴；华丽丰盛。' },
  elegance: { label: '雅集高洁', hint: '寓意文人雅趣与高洁品格；宜用梅兰菊、回纹、莲；清雅含蓄。' },
  daughter: { label: '少女礼', hint: '寓意少女美好；宜用芙蓉、石榴花、盘长；柔美灵动。' },
  children: { label: '童趣', hint: '寓意孩童守护；宜用回纹、蝴蝶；可爱生动。' },
  coming_of_age: { label: '成人礼', hint: '寓意长大成才；宜用回纹、方胜；精神昂扬。' },
  valor: { label: '勇武', hint: '寓意勇武气魄；宜用方胜、回纹；刚健有力。' },
  noble: { label: '尊贵', hint: '寓意尊贵权威；宜用方胜、锦地；雍容华贵。' },
  nature: { label: '自然四季', hint: '寓意自然生机；宜用菊、梅、莲花；清新明快。' },
  family: { label: '家业传承', hint: '寓意子孙绵延、家业兴旺；宜用石榴、牡丹、莲花。' },
  zen: { label: '静心祈福', hint: '寓意宁静、祥和与护佑；宜用莲、盘长、兰、方胜；素雅沉静。' },
  integrity: { label: '清廉高洁', hint: '寓意清正高洁；宜用莲、兰、梅；淡雅端正。' },
  friendship: { label: '友谊金兰', hint: '寓意情谊相投；宜用兰、回纹、梅；清雅隽永。' },
  gratitude: { label: '感恩', hint: '寓意感恩敬重；宜用牡丹、兰；温暖真诚。' },
  joy: { label: '喜事报喜', hint: '寓意喜事临门；宜用牡丹、梅、莲花；欢快明亮。' },
  craft: { label: '工艺雅器', hint: '适用于瓷器、织绣、建筑装饰；宜回纹、莲、牡丹。' },
  // ===== 几何新增场景 =====
  heritage: { label: '国风非遗', hint: '寓意经典传承；宜用回纹、锦地、方胜；传统配色。' },
  minimalist: { label: '极简几何', hint: '寓意干净现代；宜用回纹、方胜；黑白或单色。' },
  textile: { label: '底纹满铺', hint: '适合连续底纹与布料；宜用锦地、回纹；连续排布。' },
  emblem: { label: '徽章标识', hint: '适合居中单纹样；宜用方胜（单独）、盘长；对称完整。' },
  business: { label: '商务事业', hint: '寓意事业顺遂、开业兴隆；宜用方胜、回纹、牡丹；端庄大气。' },
}

/** 语义表 scene 原始值 → 标准场景 id（未归并的值原样返回） */
export function sceneToSceneId(scene: string): string {
  const aliased = SCENE_ALIAS[scene] ?? scene
  return SCENE_COMPACT_GROUP[aliased] ?? aliased
}

export function getSceneLabel(scene: string): string {
  const id = sceneToSceneId(scene)
  return SCENE_META[id]?.label ?? scene
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
    const meta = SCENE_META[id]
    if (meta?.label) set.add(meta.label)
    set.add(id)
  }
  return Object.fromEntries(Object.entries(map).map(([k, v]) => [k, [...v]]))
})()
