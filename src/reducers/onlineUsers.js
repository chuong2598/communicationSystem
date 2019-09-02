
const onlineUsers = (state = [], action) => {
    switch(action.type){
        case "GET_ONLINE_USER":
            return action.onlineUsers
        default:
            return state
    }
}

export default onlineUsers