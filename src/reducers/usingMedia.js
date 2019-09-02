
const usingMedia= (state = null, action) => {
    console.log(action.mediaFunction)
    switch(action.type){
        case "START_USING_MEDIA":
            return action.mediaFunction
        case "STOP_USING_MEDIA":
            return null
        default:
            return state
    }
}

export default usingMedia