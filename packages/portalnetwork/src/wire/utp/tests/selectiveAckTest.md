#TEST FOR SELECTIVE ACK

C_NODE: Control Node.  Agnosic of test.  Normal settings.  Will unexpectedly receive test cases.
T_NODE: Test Node.  Will run altered Protocol 

TEST 1:

OFFER/ACCEPT

T_NODE: Offer
                C_NODE: Accept (id)

T_NODE: SYN
                C_NODE: SYN-ACK

T_NODE: DATA 1
T_NODE: DATA 2
T_NODE: DATA 4
T_NODE: DATA 3
T_NODE: DATA 5
T_NODE: FIN 6

                        C_NODE: ACK 1
T_NODE: HANDLE ACK 1
                        C_NODE: ACK 2
T_NODE: HANDLE ACK 2
                        C_NODE: SELECTIVE ACK 4 [1,2,4]
                            - "MISSED PACKET 3"

T_NODE: HANDLE SELECTIVE ACK 4
    - "READING NODE IS MISSING PACKET 3
                     
                     C_NODE: SELECTIVE ACK 3 [1,2,3,4]
                            - "ALL MISSED PACKETS ARRIVED"

T_NODE: HANDLE SELECTIVE ACK 3
    - "READING NODE IS MISSING 0 PACKETS
                        
                        C_NODE: ACK 5
T_NODE: HANLDE ACK 5
                        C_NODE: HANDLE FIN (6)
                            - CHECKS FOR [1,2,3,4,5]
T_NODE: HANDLE FIN ACK
                        C_NODE: FINACK
