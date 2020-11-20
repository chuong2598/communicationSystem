import { AUTHENTICATE_USER } from './types'
import { GET_ALL_USER } from './types'
import {CHANGE_TAB} from './types'
import {GET_ONLINE_USER} from './types'
import {GET_OFFER} from './types'
import {CHANGE_LOGIN_STATE} from './types'

export const authenticateUser = (user) => ({
    type: AUTHENTICATE_USER,
    user
})

export const getAllUser = (users) => ({
    type: GET_ALL_USER,
    users
})

export const changeTab = (chosenTab) => ({
    type: CHANGE_TAB,
    chosenTab
})

export const changeUsingMediaState = (type, mediaFunction) => ({
    type,
    mediaFunction
})

export const getOnlineUsers = (onlineUsers) => ({
    type: GET_ONLINE_USER,
    onlineUsers
})

export const getOffer = (offer) => ({
    type: GET_OFFER,
    offer
})

export const changeLoginState = (payload) => ({
    type: CHANGE_LOGIN_STATE,
    payload
})