import { Box } from "@chakra-ui/react";
import { PortalNetwork } from "portalnetwork";
import { useEffect, useState } from "react";

interface ShowContentProps {
    portal: PortalNetwork
    contentKey?: string
}

export default function ShowContent(props: ShowContentProps) {
  
    const [data, setData] = useState<any>()

    const portal = props.portal
    
    useEffect(() => {
        portal.on('ContentAdded', (data) => setData(data))
   }, [])
  


    return (
      <Box>
          {data}
      </Box>
  )
}
