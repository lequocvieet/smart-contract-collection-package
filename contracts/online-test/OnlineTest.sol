// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

contract OnlineTest {

    struct Exam {
        address adminAddr; // address admin 
        uint reward;    // reward
        string answer;  // answer
        uint userSubmitFee;// Admin decide how much fee user should pay to submit their answer
        EXAM_STATE examState; //state of exam


    }
    enum EXAM_STATE { OPEN, CLOSED, ENDSUBMIT, CACULATING_WINNER } // State of the exam
    struct UserExam { 
        address userAddr;  // address of user
        uint examCode;  // code of exam that user participate
        string answer;  // answer
        uint submitTime;    // time submit
    }
    struct Winner {
        address winnerAddr; // Winnner address
        uint submitTime;    // time submit
    }
    event ChooseAdmin(
        address indexed adminAddress,
        uint adminEntranceFee,
        address indexed contractOwner
    );
    event CreateExam(
        uint examCode,
        address indexed adminAddress,
        uint reward,
        uint userSubmitFee
    );
    event SubmitTest(
        uint examCode,
        address indexed userAddress,
        string answer,
        uint submitTime
    );
    event EndSubmit(
        uint examCode,
        address indexed adminAddress
    );

    event SubmitAnswer(
        uint examCode,
        address indexed adminAddress,
        string answer
    );
    event CaculateWinner(
       uint examCode,
       address indexed adminAddress,
       Winner[] winners
    );

    event WithDraw(
        address indexed contractOwner,
        uint examFund
    );
    
    address public contractOwner; // Address of contract owner
    address public adminAddr; //admin who create the exam
    uint public adminEntranceFee; // contract owner decide how much fee admin need to pay when create exam
    uint public examFund;   // Fund of the exam
    uint[] public examCodes; // Array of exam code
    uint public examCode=0; //initialize exam code
    Winner[] winners;
    Winner[] clear;
    UserExam[] public userExams;    // array of user Exam
    mapping(uint => Exam) public exams; // Mapping examcode to Exam
    constructor(){
        contractOwner = msg.sender; // Init adress of contract owner
    }
    function chooseAdmin(address _adminAddr,uint _adminEntranceFee)public{
        require(msg.sender==contractOwner, "To choose Admin you must be contract owner!");
        adminAddr=_adminAddr; // init Admin for creating the exam
        adminEntranceFee=_adminEntranceFee;// init admin entranceFee
        emit ChooseAdmin(_adminAddr,_adminEntranceFee,contractOwner);
    }
   
    modifier satisfyCondition() {   // Check satisfy all condition and ready to create Exam
        require(adminAddr !=address(0));  //already choose admin
        require(adminEntranceFee!=0);//already init entranceFee
        _;
    }

    function createExams(uint _reward,uint _userSubmitFee) public payable  satisfyCondition{ // Create Exams 
        require(msg.sender==adminAddr,"You must be Admin to Create Exam");
        require(msg.sender.balance > (_reward+adminEntranceFee),"Not enough Ether to Create Exam and Pay Winner");
        require(msg.value >= adminEntranceFee,"Value admin send to contract must greater than admin fee"); //the value tranfer to contract 
        examCode++; // generate new examCode
        examCodes.push(examCode);// push examCode to array
        exams[examCode].adminAddr = msg.sender; //update admin address of the exams
        exams[examCode].reward = _reward;  //set reward
        exams[examCode].examState=EXAM_STATE.OPEN; //set state
        exams[examCode].userSubmitFee=_userSubmitFee; // set user submit fee
        examFund += adminEntranceFee;
        emit CreateExam(examCode, msg.sender, _reward, _userSubmitFee);
    }

    function submitTest(uint _examCode,string memory _answer) public payable { // user submit their exam
        require(exams[_examCode].examState==EXAM_STATE.OPEN,"Cannot submit yet!");
        require(msg.sender.balance >= exams[_examCode].userSubmitFee,"Not enough Ether to submit your exam!");  
        require(msg.value>=exams[_examCode].userSubmitFee,"Value user send to contract must greater than user submit fee");//value tranfer to contract
        UserExam memory userExam;
        userExam.userAddr = msg.sender;
        userExam.examCode = _examCode;
        userExam.answer = _answer;
        userExam.submitTime = block.timestamp;
        userExams.push(userExam);
        examFund += exams[_examCode].userSubmitFee;
        emit SubmitTest(_examCode, msg.sender, _answer, userExam.submitTime);
    }

    function endSubmit(uint _examCode) public { // admin end all user submit
        require(msg.sender==exams[_examCode].adminAddr,"You need to be Admin to end submit!");
        require(exams[_examCode].examState==EXAM_STATE.OPEN,"Admin Can't end submit yet!");
        exams[_examCode].examState=EXAM_STATE.ENDSUBMIT; // Change state to ENDSUBMIT
        emit EndSubmit(_examCode, msg.sender);
    }

    function submitAnswer(uint _examCode, string memory _answer) public { // Admin submit answer
        require(msg.sender==exams[_examCode].adminAddr,"You need to be Admin to submit answer!");
        require(exams[_examCode].examState==EXAM_STATE.ENDSUBMIT,"Admin Can't submit answer yet!");
        exams[_examCode].answer = _answer;
        exams[_examCode].examState=EXAM_STATE.CACULATING_WINNER; // Change state to Caculate winner
        emit SubmitAnswer(_examCode, msg.sender, _answer);
    }
    function caculateWinner(uint _examCode) public { // Caculate winner
        require(exams[_examCode].adminAddr == msg.sender,"Only admin can caculate winner!");
        require(exams[_examCode].examState==EXAM_STATE.CACULATING_WINNER,"Admin does not submit answer yet!");
        for (uint i = 0; i < userExams.length ; i++) { //travels through array userExams
            if(userExams[i].examCode == _examCode){ //check userExams in which exams
                if((keccak256(abi.encodePacked(userExams[i].answer))) == (keccak256(abi.encodePacked(exams[_examCode].answer)))){
                    // check equal answer
                    Winner memory winner;
                    winner.winnerAddr = userExams[i].userAddr;
                    winner.submitTime = userExams[i].submitTime;
                    winners.push(winner);
                }
            }
        }
        uint tg;
        for (uint i = 0; i < winners.length - 1; i++){
            for (uint j = i + 1; j < winners.length; j ++){
                if(winners[i].submitTime > winners[j].submitTime){  //sort in list winner by time
                    tg = winners[i].submitTime;
                    winners[i].submitTime = winners[j].submitTime;
                    winners[j].submitTime = tg;
                }
            }
        } 
        if(winners.length >= 10) {//mode 1
            uint _reward = exams[_examCode].reward / 10;
            for(uint i = 0; i < 10; i++){
                payable(winners[i].winnerAddr).transfer(_reward);
            }
        }else {//mode 2
            uint _reward = exams[_examCode].reward / winners.length;
            for(uint i = 0; i <winners.length; i++) {
                payable(winners[i].winnerAddr).transfer(_reward);
            }
        }
        emit CaculateWinner(_examCode, msg.sender, winners);
        //reset
        exams[_examCode].examState = EXAM_STATE.CLOSED;
        winners = clear;
        
    
    }
    // Function to receive Ether. msg.data must be empty
    receive() external payable {}

    function getBalance() public view returns (uint) {
        return address(this).balance;
    }
    function getAccountBalance() public view returns (uint){
        return msg.sender.balance;
    }
    function withdraw() public payable  { // with draw fund exam
        require(msg.sender == contractOwner,"You must be contract owner to withdraw money!");
        payable(contractOwner).transfer(address(this).balance); 
        emit WithDraw(msg.sender, examFund);
    }

    
}