
const isRegistering = (state = false, action) => {
    switch (action.type){
        case "CHANGE_LOGIN_STATE":
            console.log(action.payload)
            return action.payload
        default:
            return state
    }
}

export default isRegistering