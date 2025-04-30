import {create} from "zustand"

type TUserDetails = {
    id: string;
    email: string;
    username: string;
    role: string;
}

type TState = {
    userDetails: TUserDetails
}

type TAction = {
    setUserDetails: (user: TUserDetails) => void;
}

export const useUserDetailsStore = create<TState & TAction>((set) => ({
    userDetails: {
        id: '',
        email: '',
        role: '',
        username:'',
    },
    setUserDetails: (user) => set(() => ({userDetails: user})) 
}))