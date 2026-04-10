import crypto from 'crypto';

export const money = (n) => Number(n || 0).toFixed(2);
export const uuid = () => crypto.randomUUID();
export const nowISO = () => new Date().toISOString();
export const addDaysISO = (dateISO, days) => new Date(new Date(dateISO).getTime() + Number(days) * 86400000).toISOString();
export const next5s = () => new Date(Date.now() + 5000).toISOString();
export const parseLines = (text) => String(text || '').split('\n').map((s) => s.trim()).filter(Boolean);
export const eligible = (u) => Number(u.total_earned) < Number(u.total_subscribed) * 2;
export const calcShares = (plan) => Math.floor(Number(plan.shares) * (1 + Number(plan.bonus_pct) / 100));
export const randomIP = () => `${10 + Math.floor(Math.random() * 180)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
