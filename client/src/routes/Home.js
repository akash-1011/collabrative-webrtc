import React from 'react'
import { v1 as uuid } from "uuid"
import { Link } from "react-router-dom"

function Home(props) {
    
    function createRoom() {
        console.log("hiiiii")
        const id = uuid();
        return `/room/${id}`
    }

  return (
    <Link to={createRoom}>Create Room</Link>
  )
}

export default Home