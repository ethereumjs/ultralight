import * as chakra from "@chakra-ui/layout";
import { useState, useEffect } from "react";

import { PortalNetwork } from "portalnetwork";
import { Box, Flex } from "@chakra-ui/react";

type logProps = {
  portal: PortalNetwork;
  //   setLog: Function;
  //   log: string[];
};

export default function Log(props: logProps) {
  const [output, setOutput] = useState<any[]>([]);

  useEffect(() => {
    props.portal.on("log", (msg) => {
      let out = [...output];
      out.push(msg);
      setOutput(out.slice(-15));
    });
    return function () {
      props.portal.removeAllListeners("log");
    };
  });

  return (
    <Box p={2}>
      <chakra.Code height={'xl'} w={'100%'}  style={{ textAlign: "start" }}>
        {output.map((string, idx) => {
          return <div style={{fontSize: "0.7rem"}} key={idx}>{string}</div>;
        })}
      </chakra.Code>
    </Box>
  );
}

// whatever is done here has stdout captured - but note
// that `output` is updated throughout execution
