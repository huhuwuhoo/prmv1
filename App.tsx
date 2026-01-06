
import React from 'react';
import { HashRouter, Routes, Route, Link } from 'react-router-dom';
import { createConfig, http, WagmiProvider, useAccount, useConnect, useDisconnect, useSwitchChain } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { walletConnect, injected } from 'wagmi/connectors';
import { WALLETCONNECT_PROJECT_ID } from './constants';

import Dashboard from './pages/Dashboard';
import TokenDetail from './pages/TokenDetail';
import CreateToken from './pages/CreateToken';

// 强制只配置 Base Sepolia 链
const config = createConfig({
  chains: [baseSepolia],
  connectors: [
    injected(),
    walletConnect({ projectId: WALLETCONNECT_PROJECT_ID }),
  ],
  transports: {
    // 强制使用 Base Sepolia 官方公共节点，确保读取测试网数据
    [baseSepolia.id]: http('https://sepolia.base.org'),
  },
});

const queryClient = new QueryClient();

const Navbar = () => {
  const { address, isConnected, chain } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();

  // 严谨的网络校验
  const isWrongNetwork = isConnected && chain?.id !== baseSepolia.id;

  return (
    <div className="flex flex-col w-full">
      {isWrongNetwork && (
        <div className="bg-red-600 text-white text-center py-2 px-4 text-xs font-bold z-[100] sticky top-0">
          ⚠️ 注意：当前在 {chain?.name || '未知网络'}。请 
          <button 
            onClick={() => switchChain({ chainId: baseSepolia.id })}
            className="underline ml-1 font-black hover:opacity-80"
          >
            切换到 Base Sepolia (测试网)
          </button>
          ，否则无法看到正确余额和代币。
        </div>
      )}
      <nav className="border-b border-white/10 px-4 py-3 flex justify-between items-center bg-[#0d0d0d] sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <Link to="/" className="text-2xl font-bold text-green-500 hover:opacity-80 transition-opacity flex items-center gap-2">
            <span className="bg-green-500 text-black px-1.5 rounded font-black text-sm">FP</span>
            FairPraem
          </Link>
          <div className="hidden sm:flex items-center gap-2">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-tighter ${isWrongNetwork ? 'bg-red-500/20 text-red-500 border-red-500/30' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
              {isWrongNetwork ? '网络错误' : 'Base Sepolia Testnet'}
            </span>
          </div>
        </div>
        <div className="flex gap-4 items-center">
          <Link to="/create" className="text-sm font-medium hover:text-green-400 transition-colors bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
            [ 发新币 ]
          </Link>
          {isConnected ? (
            <div className="flex items-center gap-2">
              <div className="text-right hidden md:block">
                <p className="text-[10px] text-gray-500 leading-none">钱包已连接</p>
                <p className="text-[10px] font-mono">{address?.slice(0, 6)}...{address?.slice(-4)}</p>
              </div>
              <button 
                onClick={() => disconnect()}
                className="bg-red-500/10 text-red-500 border border-red-500/20 px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-red-500 hover:text-white transition-all"
              >
                断开
              </button>
            </div>
          ) : (
            <button 
              onClick={() => connect({ connector: connectors[0] })}
              className="bg-green-500 text-black px-4 py-1.5 rounded-lg text-sm font-bold hover:bg-green-400 transition-all shadow-[0_0_15px_rgba(34,197,94,0.3)]"
            >
              连接钱包
            </button>
          )}
        </div>
      </nav>
    </div>
  );
};

export default function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <HashRouter>
          <div className="min-h-screen bg-[#0d0d0d] text-white">
            <Navbar />
            <main className="max-w-6xl mx-auto p-4 md:p-6 pb-24">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/token/:address" element={<TokenDetail />} />
                <Route path="/create" element={<CreateToken />} />
              </Routes>
            </main>
          </div>
        </HashRouter>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
