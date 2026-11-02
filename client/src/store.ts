import { create } from 'zustand';
type UIState={user:any|null;setUser:(u:any)=>void;clearUser:()=>void};
export const useUIStore=create<UIState>(set=>({user:null,setUser:user=>set({user}),clearUser:()=>set({user:null})}));
