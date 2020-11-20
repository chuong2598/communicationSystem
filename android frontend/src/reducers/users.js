
const users = (state = {}, action) => {
    console.log(action.users)
    switch (action.type){
        case "GET_ALL_USER":
            return action.users
        default:
            return state
    }
}

export default users