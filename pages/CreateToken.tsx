
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi';
import { CORE_ADDRESS, CORE_ABI } from '../constants';

export default function CreateToken() {
  const navigate = useNavigate();
  const { isConnected } = useAccount();
  const [formData, setFormData] = useState({ name: '', symbol: '' });
  
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const handleLaunch = () => {
    if (!formData.name || !formData.symbol) return;
    // Fixed: Cast ABI to any to resolve property mismatch in wagmi's writeContract type union
    writeContract({
      address: CORE_ADDRESS as `0x${string}`,
      abi: CORE_ABI as any,
      functionName: 'launchToken',
      args: [formData.name, formData.symbol],
    });
  };

  // Logic to handle success redirect (would ideally use event listening, but hash lookup works for demo)
  React.useEffect(() => {
    if (isSuccess) {
      setTimeout(() => navigate('/'), 2000);
    }
  }, [isSuccess, navigate]);

  return (
    <div className="max-w-xl mx-auto py-10">
      <div className="card-bg pump-border rounded-2xl p-8">
        <h1 className="text-3xl font-bold mb-2">发行新币</h1>
        <p className="text-gray-400 mb-8">只需点击一下，即可部署您自己的联合曲线代币。</p>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2 font-mono uppercase tracking-widest">代币名称</label>
            <input 
              type="text" 
              placeholder="如：Pepe Moon"
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-4 text-white focus:outline-none focus:border-green-500/50 transition-colors"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2 font-mono uppercase tracking-widest">代币符号 (Ticker)</label>
            <input 
              type="text" 
              placeholder="如：PEPE"
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-4 text-white focus:outline-none focus:border-green-500/50 transition-colors uppercase"
              value={formData.symbol}
              onChange={e => setFormData({ ...formData, symbol: e.target.value.toUpperCase() })}
            />
          </div>

          <div className="p-4 bg-green-500/5 rounded-xl border border-green-500/10 text-sm text-green-500 leading-relaxed">
            <p className="font-bold mb-1">费用说明：</p>
            发行代币是免费的（只需支付 Gas 费）。所有买卖交易将收取 0.5% 的交易费以支持协议的良性运作。
          </div>

          {!isConnected ? (
            <div className="text-center p-4 bg-red-500/5 border border-red-500/10 rounded-xl text-red-400 text-sm">
              请先连接钱包以发行新代币。
            </div>
          ) : (
            <button 
              disabled={!formData.name || !formData.symbol || isPending || isConfirming}
              onClick={handleLaunch}
              className="w-full bg-green-500 text-black py-4 rounded-xl font-bold text-lg hover:bg-green-400 transition-all shadow-[0_0_20px_rgba(34,197,94,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending || isConfirming ? '发布中...' : '创建代币'}
            </button>
          )}

          {isSuccess && (
            <div className="text-center text-green-500 font-bold animate-bounce">
              代币发布成功！正在跳转...
            </div>
          )}

          {error && (
            <div className="text-center text-red-500 text-xs bg-red-500/10 p-2 rounded">
              错误: {error.message.includes('User rejected') ? '用户取消了交易' : '执行失败'}
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 text-center text-gray-500 text-sm">
        <p>您的代币初始供应量将为 1,000,000,000 {formData.symbol || 'TOKENS'}</p>
        <p className="mt-2 font-mono text-xs">合约地址: {CORE_ADDRESS}</p>
      </div>
    </div>
  );
}
