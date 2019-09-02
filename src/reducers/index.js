import {combineReducers} from 'redux'
import authenticatedUser from './authenticatedUser'
import users from './users'
import chosenTab from './chosenTab'
import usingMedia from './usingMedia'
import onlineUsers from './onlineUsers'
import offer from './offer'
import isRegistering from './isRegistering'

export default combineReducers({
    authenticatedUser,
    users,
    chosenTab,
    usingMedia,
    onlineUsers,
    offer,
    isRegistering
})