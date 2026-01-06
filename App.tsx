
import React from 'react';
import { HashRouter, Routes, Route, Link } from 'react-router-dom';
import { createConfig, http, WagmiProvider, useAccount, useConnect, useDisconnect } from 'wagmi';
import { mainnet, sepolia } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { walletConnect, injected } from 'wagmi/connectors';
import { WALLETCONNECT_PROJECT_ID } from './constants';

import Dashboard from './pages/Dashboard';
import TokenDetail from './pages/TokenDetail';
import CreateToken from './pages/CreateToken';

const config = createConfig({
  chains: [mainnet, sepolia],
  connectors: [
    injected(),
    walletConnect({ projectId: WALLETCONNECT_PROJECT_ID }),
  ],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
  },
});

const queryClient = new QueryClient();

const Navbar = () => {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  return (
    <nav className="border-b border-white/10 px-4 py-3 flex justify-between items-center bg-[#0d0d0d] sticky top-0 z-50">
      <Link to="/" className="text-2xl font-bold text-green-500 hover:opacity-80 transition-opacity">
        FairPraem
      </Link>
      <div className="flex gap-4 items-center">
        <Link to="/create" className="hidden md:block text-sm font-medium hover:text-green-400 transition-colors">
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
              断开连接
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
