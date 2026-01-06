
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

// 显式指定 Base Sepolia 配置，确保数据获取稳定
const config = createConfig({
  chains: [baseSepolia],
  connectors: [
    injected(),
    walletConnect({ projectId: WALLETCONNECT_PROJECT_ID }),
  ],
  transports: {
    // 使用官方备用节点提高稳定性
    [baseSepolia.id]: http('https://sepolia.base.org'),
  },
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

const Navbar = () => {
  const { address, isConnected, chain } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();

  const isWrongNetwork = isConnected && chain?.id !== baseSepolia.id;

  return (
    <>
      {isWrongNetwork && (
        <div className="bg-yellow-500 text-black text-center py-2 px-4 text-xs font-bold animate-pulse z-[60] relative">
          ⚠️ 警告: 检测到当前不在测试网。请 
          <button 
            onClick={() => switchChain({ chainId: baseSepolia.id })}
            className="underline ml-1 font-black hover:opacity-80"
          >
            切换到 Base Sepolia
          </button>
        </div>
      )}
      <nav className="border-b border-white/10 px-4 py-3 flex justify-between items-center bg-[#0d0d0d] sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <Link to="/" className="text-2xl font-bold text-green-500 hover:opacity-80 transition-opacity flex items-center gap-2">
            <span className="w-8 h-8 bg-green-500 rounded flex items-center justify-center text-black text-xs font-black">FP</span>
            FairPraem
          </Link>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-tighter ${isWrongNetwork ? 'bg-red-500/20 text-red-500 border-red-500/30' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
              {isWrongNetwork ? '网络错误' : 'Base Sepolia'}
            </span>
          </div>
        </div>
        <div className="flex gap-4 items-center">
          <Link to="/create" className="hidden md:block text-sm font-medium hover:text-green-400 transition-colors bg-white/5 px-3 py-1 rounded-full border border-white/10">
            [ 发布新币 ]
          </Link>
          {isConnected ? (
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono bg-white/5 px-2 py-1 rounded border border-white/10">
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </span>
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
    </>
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
