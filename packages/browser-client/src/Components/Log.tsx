import * as chakra from "@chakra-ui/layout";
import { useState, useEffect } from "react";

import { PortalNetwork } from "portalnetwork";

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
      setOutput(out.slice(-10));
    });
    return function () {
      props.portal.removeAllListeners("log");
    };
  });

  return (
    <chakra.Box>
      <chakra.Code style={{ textAlign: "start" }}>
        {output.map((string, idx) => {
          return <div key={idx}>{string}</div>;
        })}
      </chakra.Code>
    </chakra.Box>
  );
}

// whatever is done here has stdout captured - but note
// that `output` is updated throughout execution
