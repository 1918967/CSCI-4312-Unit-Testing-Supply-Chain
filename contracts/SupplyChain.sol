// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

import "./Library.sol";

contract SupplyChain {
    // ********** STATE VARIABLES **********
    // uint256 constant maxDeliveryTime = 864000; // original
    uint256 constant maxDeliveryTime = 300;
    address admin;
    uint256 registrationId;
    uint256 accountId;
    uint256 productId;
    uint256 orderId;
    mapping(address => Library.Registration) public registrations;
    mapping(address => Library.Account) public accounts;
    mapping(uint256 => Library.Product) public products;
    mapping(uint256 => Library.Order) public orders;

    // ********** CONSTRUCTOR **********
    constructor() {
        admin = msg.sender;
        registrationId = 1;
        accountId = 1;
        productId = 1;
        orderId = 1;
    }

    // ********** EVENTS **********
    event NewRegistration(uint256 reg_id, address _address, string _username, Library.UserCategory _userCategory, bool _isAuthenticated);
    event ApproveUser(uint256 acc_id, address _address, string _username, Library.UserCategory _userCategory, bool _isAuthenticated);
    event Product(uint256 productId, string productName, uint256 productPrice, address _address);
    event Order(uint256 orderId, uint256 productId, uint256 quantity, uint256 totalPrice,  bool isDelivered, address customer, address seller, bool isApprovedByCustoms);
    event Ownership(address _address, uint256 orderId);
    event ParcelApproval(uint256 ordId);

    // ********** MODIFIERS **********
    modifier VerifyUserIsAdmin() {
        require(msg.sender == admin);
        _;
    }

    modifier VerifyCallerIsUser() {
        require(accounts[msg.sender].id != 0);
        _;
    }

    modifier VerifyUserIsCustoms() {
        require(
            accounts[msg.sender].userCategory == Library.UserCategory.Customs
        );
        _;
    }

    modifier VerifyUserIsSeller() {
        require(
            accounts[msg.sender].userCategory == Library.UserCategory.LocalSeller || accounts[msg.sender].userCategory == Library.UserCategory.ForeignSeller
        );
        _;
    }

    modifier VerifyUserIsCustomer() {
        require(
            accounts[msg.sender].userCategory == Library.UserCategory.Customer
        );
        _;
    }

    modifier VerifyUserRegistration(address regUser) {
        require(registrations[regUser].id != 0);
        _;
    }

    modifier VerifyCallerIsCurrentOwner(uint256 ordId) {
        require(msg.sender == orders[ordId].currentOwnership, "The caller is not the current owner");
        _;
    }

    modifier VerifyNextOwnerEligibility(address to, uint256 ordId) {
        if(
            accounts[msg.sender].userCategory == Library.UserCategory.ForeignSeller &&
                accounts[to].userCategory == Library.UserCategory.ForeignCarrier && accounts[to].id != 0
        )
        _;
        if(
            accounts[msg.sender].userCategory == Library.UserCategory.LocalSeller &&
                accounts[to].userCategory == Library.UserCategory.LocalCarrier && accounts[to].id != 0
        )
        _;
        if(
            accounts[msg.sender].userCategory ==
                Library.UserCategory.ForeignCarrier &&
                accounts[to].userCategory ==
                Library.UserCategory.ShippingCompany && accounts[to].id != 0
        )
        _;
        if(
            accounts[msg.sender].userCategory ==
                Library.UserCategory.ShippingCompany &&
                accounts[to].userCategory ==
                Library.UserCategory.LocalCarrier &&
                orders[ordId].isApprovedByCustoms == true && accounts[to].id != 0
        )
        _;
        if(
            accounts[msg.sender].userCategory ==
                Library.UserCategory.LocalCarrier &&
                accounts[to].userCategory == Library.UserCategory.Customer && accounts[to].id != 0
        )
        _;
    }

    // ********** FUNCTIONS **********
    function registerUser(
        string memory username,
        Library.UserCategory userCategory
    ) external {
        registrations[msg.sender] = Library.Registration(
            registrationId,
            msg.sender,
            username,
            userCategory,
            false
        );
        emit NewRegistration(registrationId, msg.sender, username, userCategory, false);
        registrationId++;
    }
    
    function approveUser(address registeredUser)
        external
        VerifyUserIsAdmin
        VerifyUserRegistration(registeredUser)
    {
        accounts[registeredUser] = Library.Account(
            accountId,
            registeredUser,
            registrations[registeredUser].username,
            registrations[registeredUser].userCategory
        );
        registrations[registeredUser].isAuthenticated = true;
        emit ApproveUser(accountId, registeredUser, registrations[registeredUser].username, registrations[registeredUser].userCategory, registrations[registeredUser].isAuthenticated);
        accountId++;
    }
    
    function addProduct(string memory productName, uint256 productPrice)
        external
        VerifyUserIsSeller
    {
        products[productId] = Library.Product(
            productId,
            productName,
            productPrice,
            msg.sender
        );
        emit Product(productId, productName, productPrice, msg.sender);
        productId++;
    }

    function placeOrder(uint256 prodId, uint256 quantity)
        external
        VerifyUserIsCustomer
        VerifyCallerIsUser
    {
        uint256 expectedDeliveryDate = block.timestamp + maxDeliveryTime;
        uint256 totalPrice = quantity * products[prodId].price;
        orders[orderId] = Library.Order(
            orderId,
            prodId,
            quantity,
            totalPrice,
            expectedDeliveryDate,
            false,
            products[prodId].seller,
            msg.sender,
            false
        );
        emit Order(orderId, prodId, quantity, totalPrice, false, msg.sender, products[prodId].seller, false);
        orderId++;
    }

    function transferOwnership(address to, uint256 ordId)
        external
        VerifyCallerIsCurrentOwner(ordId)
        VerifyNextOwnerEligibility(to, ordId)
    {
        Library.Order storage order = orders[ordId];
        order.currentOwnership = to;
        emit Ownership(to, ordId);
    }

    function approveParcels(uint256 ordId) external VerifyUserIsCustoms {
        orders[ordId].isApprovedByCustoms = true;
        emit ParcelApproval(ordId);
    }

    function queryOrderOwnership(uint256 ordId)
        external
        view
        VerifyCallerIsUser
        returns (Library.UserCategory userCat)
    {
        return accounts[orders[ordId].currentOwnership].userCategory;
    }

    function checkOrderValidity(uint256 ordId)
        external
        view
        VerifyCallerIsUser
        returns (bool isValid)
    {
        uint256 expectedDeliveryDate = orders[ordId].expectedDeliveryDate;
        if (block.timestamp > expectedDeliveryDate) return false;
        else return true;
    }
}
