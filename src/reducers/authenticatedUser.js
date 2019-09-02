
const authenticatedUser = (state = {}, action) => {
    switch (action.type){
        case "AUTHENTICATE_USER":
            return action.user
        default:
            return state
    }
}

export default authenticatedUser