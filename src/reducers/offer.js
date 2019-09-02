
const offer = (state = {}, action) => {
    switch(action.type){
        case "GET_OFFER":
            console.log(action.offer)
            return action.offer
        default:
            return state
    }
}

export default offer