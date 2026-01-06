
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

// 强制配置：仅允许 Base Sepolia (84532)
const config = createConfig({
  chains: [baseSepolia],
  connectors: [
    injected(),
    walletConnect({ projectId: WALLETCONNECT_PROJECT_ID }),
  ],
  transports: {
    // 强制使用 Base Sepolia 官方节点进行所有数据交互
    [baseSepolia.id]: http('https://sepolia.base.org'),
  },
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
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
    <div className="flex flex-col w-full">
      {isWrongNetwork && (
        <div className="bg-yellow-500 text-black text-center py-2 px-4 text-xs font-bold z-[100] sticky top-0 flex items-center justify-center gap-2">
          <span>⚠️ 您的钱包当前连接到 {chain?.name || '其他网络'}，请切换以查看测试网代币</span>
          <button 
            onClick={() => switchChain({ chainId: baseSepolia.id })}
            className="bg-black text-white px-2 py-0.5 rounded text-[10px] hover:opacity-80 transition-opacity uppercase"
          >
            切换到 Base Sepolia
          </button>
        </div>
      )}
      <nav className="border-b border-white/10 px-6 py-4 flex justify-between items-center bg-[#0d0d0d] sticky top-0 z-50">
        <div className="flex items-center gap-6">
          <Link to="/" className="text-2xl font-black text-green-500 hover:opacity-80 transition-opacity flex items-center gap-2 tracking-tighter">
            <span className="bg-green-500 text-black px-1.5 py-0.5 rounded leading-none text-sm">PUMP</span>
            FAIRPRAEM
          </Link>
          <div className="hidden md:flex items-center gap-2 text-[10px] font-mono text-gray-500">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            BASE SEPOLIA ACTIVE
          </div>
        </div>
        <div className="flex gap-4 items-center">
          <Link to="/create" className="text-sm font-bold text-green-500 hover:text-white transition-colors border border-green-500/20 px-4 py-2 rounded-xl bg-green-500/5">
            [ 发射新币 ]
          </Link>
          {isConnected ? (
            <div className="flex items-center gap-4 bg-white/5 border border-white/10 pl-4 pr-2 py-1.5 rounded-2xl">
              <span className="text-xs font-mono text-gray-400">
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </span>
              <button 
                onClick={() => disconnect()}
                className="bg-red-500/10 text-red-500 text-[10px] font-black px-3 py-1.5 rounded-lg hover:bg-red-500 hover:text-white transition-all uppercase"
              >
                断开
              </button>
            </div>
          ) : (
            <button 
              onClick={() => connect({ connector: connectors[0] })}
              className="bg-green-500 text-black px-6 py-2 rounded-2xl text-sm font-black hover:bg-green-400 transition-all shadow-[0_0_20px_rgba(34,197,94,0.3)]"
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
            <main className="max-w-7xl mx-auto p-6 md:p-8 pb-32">
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
