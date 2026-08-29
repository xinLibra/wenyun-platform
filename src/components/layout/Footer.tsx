import { BranchDivider } from '../decorations/IceCrackDivider'
import { Logo } from '../ui/Logo'
import { Link, useNavigate } from 'react-router-dom'

export default function Footer() {
  const navigate = useNavigate()
  
  const handleTermsClick = (path: string) => {
    navigate(path)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  return (
    <footer className="bg-deep-blue text-rice-paper">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <BranchDivider />
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center mb-4">
              <Logo variant="footer" colorScheme="blue-bg" showFull={false} />
            </div>
            <p className="font-song text-rice-paper/70 mb-4 max-w-md">
              传承千年非遗文化，用AI技术赋能创意设计。让传统纹样在现代生活中焕发新生，创造独一无二的文创产品。
            </p>
            <div className="flex items-center space-x-2 text-rice-paper/70">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span className="font-song text-sm">3684553782@qq.com</span>
            </div>
          </div>

          <div>
            <h3 className="font-shufa text-lg mb-4 text-ming-yellow">快速链接</h3>
            <ul className="space-y-2 font-song text-rice-paper/70">
              <li><Link to="/" className="hover:text-ming-yellow transition-colors">首页</Link></li>
              <li><Link to="/create" className="hover:text-ming-yellow transition-colors">创作纹样</Link></li>
              <li><Link to="/customize" className="hover:text-ming-yellow transition-colors">定制产品</Link></li>
              <li><Link to="/gallery" className="hover:text-ming-yellow transition-colors">作品展示</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-shufa text-lg mb-4 text-ming-yellow">关于我们</h3>
            <ul className="space-y-2 font-song text-rice-paper/70">
              <li><Link to="/platform" className="hover:text-ming-yellow transition-colors">平台介绍</Link></li>
              <li><Link to="/culture" className="hover:text-ming-yellow transition-colors">非遗文化</Link></li>
              <li><Link to="/about" className="hover:text-ming-yellow transition-colors">联系我们</Link></li>
              <li><Link to="/help" className="hover:text-ming-yellow transition-colors">帮助中心</Link></li>
            </ul>
          </div>
        </div>

        <BranchDivider />

        <div className="flex flex-col md:flex-row justify-between items-center pt-6 border-t border-rice-paper/10">
          <p className="font-song text-sm text-rice-paper/50">
            © 2026 纹韵. 保留所有权利.
          </p>
          <div className="flex space-x-6 mt-4 md:mt-0 font-song text-sm text-rice-paper/50">
            <button onClick={() => handleTermsClick('/terms')} className="hover:text-ming-yellow transition-colors cursor-pointer">隐私政策</button>
            <button onClick={() => handleTermsClick('/terms')} className="hover:text-ming-yellow transition-colors cursor-pointer">服务条款</button>
            <button onClick={() => handleTermsClick('/terms')} className="hover:text-ming-yellow transition-colors cursor-pointer">使用协议</button>
          </div>
        </div>
      </div>
    </footer>
  )
}
