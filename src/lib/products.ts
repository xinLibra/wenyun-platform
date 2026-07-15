export interface Product {
  name: string
  price: string
  image: string
}

export const products: Record<string, Product> = {
  bookmark: { name: '书签', price: '19', image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=wooden%20bookmark%20blank%20minimal%20elegant%20product%20photography&image_size=portrait_4_3' },
  phonecase: { name: '手机壳', price: '49', image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=smartphone%20case%20blank%20white%20minimal%20product%20photography&image_size=portrait_4_3' },
  notebook: { name: '笔记本', price: '39', image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=notebook%20blank%20elegant%20minimal%20product%20photography&image_size=portrait_4_3' },
  postcard: { name: '明信片', price: '12', image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=postcard%20blank%20white%20minimal%20product%20photography&image_size=landscape_4_3' },
  tote: { name: '手提袋', price: '59', image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=canvas%20tote%20bag%20blank%20white%20minimal%20product%20photography&image_size=square' },
  scarf: { name: '围巾', price: '299', image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=blank%20wool%20scarf%20elegant%20minimal%20product%20photography&image_size=square' },
  silkscarf: { name: '丝巾', price: '199', image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=silk%20scarf%20blank%20white%20elegant%20product%20photography&image_size=square' },
  square_scarf: { name: '方巾', price: '149', image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=silk%20square%20scarf%20blank%20white%20elegant%20product%20photography&image_size=square' },
  tshirt: { name: 'T恤', price: '89', image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=blank%20white%20cotton%20t-shirt%20minimal%20product%20photography&image_size=portrait_4_3' },
}

export const materials: Record<string, string> = {
  wood: '木质',
  plastic: '塑料',
  silicone: '硅胶',
  silk: '丝绸',
  paper: '纸张',
  leather: '皮革',
  canvas: '帆布',
  cotton: '纯棉',
  wool: '羊毛',
  polyester: '涤纶',
}
