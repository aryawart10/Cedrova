export type BrokerStatus = 'connected' | 'disconnected' | 'needs-reauth' | 'coming-soon';

export type Broker = {
  id: string;
  name: string;
  legal: string;
  /** Two-letter mark drawn typographically instead of shipping logo assets. */
  mark: string;
  markHue: number;
  status: BrokerStatus;
  authKind: string;
  capabilities: { label: string; supported: boolean }[];
  clients?: string;
  lastSync?: string;
  note: string;
  charges: string;
};

export const BROKERS: Broker[] = [
  {
    id: 'zerodha',
    name: 'Zerodha',
    legal: 'Kite Connect v3',
    mark: 'Z',
    markHue: 28,
    status: 'connected',
    authKind: 'API key + daily request token',
    capabilities: [
      { label: 'Holdings & positions', supported: true },
      { label: 'Place / modify / cancel', supported: true },
      { label: 'GTT orders', supported: true },
      { label: 'Basket orders', supported: true },
      { label: 'Historical candles', supported: true },
      { label: 'Websocket ticks', supported: true },
    ],
    clients: 'ZD4821',
    lastSync: '2 min ago',
    note: 'Request token expires every morning at 07:30 IST. Cedrova prompts you once a day.',
    charges: '\u20B920 per executed order, intraday and F&O',
  },
  {
    id: 'groww',
    name: 'Groww',
    legal: 'Groww Trade API',
    mark: 'G',
    markHue: 152,
    status: 'connected',
    authKind: 'OAuth 2.0 with TOTP',
    capabilities: [
      { label: 'Holdings & positions', supported: true },
      { label: 'Place / modify / cancel', supported: true },
      { label: 'GTT orders', supported: false },
      { label: 'Basket orders', supported: false },
      { label: 'Historical candles', supported: true },
      { label: 'Websocket ticks', supported: true },
    ],
    clients: 'GW99137',
    lastSync: '11 min ago',
    note: 'No GTT endpoint, so stop losses on this account are managed by Cedrova during market hours only.',
    charges: '\u20B920 or 0.05% per order, whichever is lower',
  },
  {
    id: 'upstox',
    name: 'Upstox',
    legal: 'Upstox API v2',
    mark: 'U',
    markHue: 258,
    status: 'needs-reauth',
    authKind: 'OAuth 2.0',
    capabilities: [
      { label: 'Holdings & positions', supported: true },
      { label: 'Place / modify / cancel', supported: true },
      { label: 'GTT orders', supported: true },
      { label: 'Basket orders', supported: true },
      { label: 'Historical candles', supported: true },
      { label: 'Websocket ticks', supported: true },
    ],
    clients: 'UP20581',
    lastSync: '3 days ago',
    note: 'Access token expired. Reconnect to resume holdings sync and order routing.',
    charges: '\u20B920 per order, delivery free',
  },
  {
    id: 'angelone',
    name: 'Angel One',
    legal: 'SmartAPI',
    mark: 'A',
    markHue: 18,
    status: 'disconnected',
    authKind: 'API key + MPIN + TOTP',
    capabilities: [
      { label: 'Holdings & positions', supported: true },
      { label: 'Place / modify / cancel', supported: true },
      { label: 'GTT orders', supported: true },
      { label: 'Basket orders', supported: false },
      { label: 'Historical candles', supported: true },
      { label: 'Websocket ticks', supported: true },
    ],
    note: 'Requires a TOTP secret from the SmartAPI dashboard, not your login OTP.',
    charges: '\u20B920 per order, delivery free',
  },
  {
    id: 'dhan',
    name: 'Dhan',
    legal: 'DhanHQ v2',
    mark: 'D',
    markHue: 198,
    status: 'disconnected',
    authKind: 'Static access token',
    capabilities: [
      { label: 'Holdings & positions', supported: true },
      { label: 'Place / modify / cancel', supported: true },
      { label: 'GTT orders', supported: true },
      { label: 'Basket orders', supported: true },
      { label: 'Historical candles', supported: true },
      { label: 'Websocket ticks', supported: true },
    ],
    note: 'Token is valid for 30 days and does not need a daily login. Best fit for unattended strategies.',
    charges: '\u20B920 per order, delivery free',
  },
  {
    id: 'fyers',
    name: 'Fyers',
    legal: 'Fyers API v3',
    mark: 'F',
    markHue: 320,
    status: 'coming-soon',
    authKind: 'OAuth 2.0',
    capabilities: [
      { label: 'Holdings & positions', supported: true },
      { label: 'Place / modify / cancel', supported: true },
      { label: 'GTT orders', supported: false },
      { label: 'Basket orders', supported: true },
      { label: 'Historical candles', supported: true },
      { label: 'Websocket ticks', supported: true },
    ],
    note: 'Adapter in internal testing. Expected in the next release.',
    charges: '\u20B920 per order',
  },
  {
    id: 'icicidirect',
    name: 'ICICI Direct',
    legal: 'Breeze API',
    mark: 'I',
    markHue: 38,
    status: 'coming-soon',
    authKind: 'API session key',
    capabilities: [
      { label: 'Holdings & positions', supported: true },
      { label: 'Place / modify / cancel', supported: true },
      { label: 'GTT orders', supported: false },
      { label: 'Basket orders', supported: false },
      { label: 'Historical candles', supported: true },
      { label: 'Websocket ticks', supported: false },
    ],
    note: 'Session key rotates daily and rate limits are tight. Suitable for positional strategies only.',
    charges: 'Plan dependent',
  },
];

export const STATUS_LABEL: Record<BrokerStatus, string> = {
  connected: 'Connected',
  disconnected: 'Not connected',
  'needs-reauth': 'Reconnect needed',
  'coming-soon': 'Coming soon',
};

/* Order log shown under the broker list — proves routing is real in the UI sense. */
export type OrderRow = {
  time: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  qty: number;
  price: number;
  brokerId: string;
  product: 'CNC' | 'MIS' | 'NRML';
  status: 'COMPLETE' | 'OPEN' | 'REJECTED' | 'CANCELLED';
  origin: string;
  reason?: string;
};

export const ORDER_LOG: OrderRow[] = [
  { time: '09:16:04', symbol: 'TATAMOTORS', side: 'BUY', qty: 140, price: 954.2, brokerId: 'zerodha', product: 'CNC', status: 'COMPLETE', origin: 'Cross-sectional Momentum 100' },
  { time: '09:16:06', symbol: 'LT', side: 'BUY', qty: 36, price: 3608.5, brokerId: 'zerodha', product: 'CNC', status: 'COMPLETE', origin: 'Cross-sectional Momentum 100' },
  { time: '09:16:09', symbol: 'DMART', side: 'SELL', qty: 28, price: 4190.0, brokerId: 'zerodha', product: 'CNC', status: 'COMPLETE', origin: 'Cross-sectional Momentum 100' },
  { time: '09:21:47', symbol: 'ICICIBANK', side: 'BUY', qty: 210, price: 1246.8, brokerId: 'groww', product: 'CNC', status: 'COMPLETE', origin: 'Bank Nifty Mean Reversion (paper)' },
  { time: '10:04:12', symbol: 'ADANIENT', side: 'BUY', qty: 60, price: 2402.0, brokerId: 'upstox', product: 'MIS', status: 'REJECTED', origin: 'Manual', reason: 'Token expired \u2014 reconnect Upstox' },
  { time: '11:52:30', symbol: 'NIFTYBEES', side: 'BUY', qty: 1_400, price: 282.4, brokerId: 'groww', product: 'CNC', status: 'COMPLETE', origin: 'Index Trend Overlay' },
  { time: '14:28:55', symbol: 'SUNPHARMA', side: 'SELL', qty: 45, price: 1801.6, brokerId: 'zerodha', product: 'CNC', status: 'OPEN', origin: 'Portfolio Risk Auditor rebalance' },
];

export const brokerById = (id: string) => BROKERS.find((b) => b.id === id);
export const brokerName = (id: string) => brokerById(id)?.name ?? id;
