
const chosenTab = (state= "liveStream", action) => {
    switch (action.type){
        case "CHANGE_TAB":
            console.log(action.chosenTab)
            return action.chosenTab
        default:
            return state
    }
}

export default chosenTab