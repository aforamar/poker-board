import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

export const getGames       = ()             => api.get('/games').then(r => r.data);
export const createGame     = (name, buyIn)  => api.post('/games', { name, buy_in_amount: buyIn }).then(r => r.data);
export const getGame        = (id)           => api.get(`/games/${id}`).then(r => r.data);
export const deleteGame     = (id)           => api.delete(`/games/${id}`).then(r => r.data);

export const getPlayers     = (gid)          => api.get(`/games/${gid}/players`).then(r => r.data);
export const addPlayer      = (gid, name, color) => api.post(`/games/${gid}/players`, { name, color }).then(r => r.data);
export const removePlayer   = (gid, pid)     => api.delete(`/games/${gid}/players/${pid}`).then(r => r.data);
export const addBuyin       = (gid, pid, amount) => api.post(`/games/${gid}/players/${pid}/buyin`, { amount }).then(r => r.data);
export const removeBuyin    = (gid, pid)         => api.delete(`/games/${gid}/players/${pid}/buyin`).then(r => r.data);
export const setCashout     = (gid, pid, amount) => api.post(`/games/${gid}/players/${pid}/cashout`, { amount }).then(r => r.data);

export const getSettlement  = (gid)          => api.get(`/games/${gid}/settle`).then(r => r.data);
