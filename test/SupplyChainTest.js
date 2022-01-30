//const { artifacts} = require("truffle");
const { BN, expectEvent } = require("@openzeppelin/test-helpers");
const { assert } = require("chai");
const Supply = artifacts.require("SupplyChain");


contract('SupplyChain', (accounts) => {
    before(async () => {
        this.UserCategory_Enum = {
            LocalSeller: {val: "LocalSeller", pos:0},
            ForeignSeller: {val: "ForeignSeller", pos:1},
            LocalCarrier: {val: "LocalCarrier", pos:2},
            ForeignCarrier: {val: "ForeignCarrier", pos:3},
            ShippingCompany: {val: "ShippingCompany", pos:4},
            Customs: {val: "Customs", pos:5},
            Customer: {val: "Customer", pos:6}
        };
        this.registrations_ ={
            LocalSeller:{
                address:accounts[1],
                id: 1,
                category: this.UserCategory_Enum.LocalSeller,
                username: "Taha"
            },
            ForeignSeller:{
                address:accounts[2],
                id: 2,
                category: this.UserCategory_Enum.ForeignSeller,
                username: "Hamza"
            },
            LocalCarrier:{
                address:accounts[3],
                id: 3,
                category: this.UserCategory_Enum.LocalCarrier,
                username: "Johann"
            },
            ForeignCarrier:{
                address:accounts[4],
                id: 4,
                category: this.UserCategory_Enum.ForeignCarrier,
                username: "Ayoub"
            },
            ShippingCompany:{
                address:accounts[5],
                id: 5,
                category: this.UserCategory_Enum.ShippingCompany,
                username: "Ali"
            },
            Customs:{
                address:accounts[6],
                id: 6,
                category: this.UserCategory_Enum.Customs,
                username: "Raaghidh"
            },
            Customer:{
                address:accounts[7],
                id: 7,
                category: this.UserCategory_Enum.Customer,
                username: "Farhan"
            },
        }
        this.supplyStatus = await Supply.deployed()
    });
    //Testing registration function
    it("Should register a user", async () => {
        for(var user in this.registrations_){
            var userDetails = this.registrations_[user];
            var register = await this.supplyStatus.registerUser(userDetails.username, userDetails.category.pos, {from: userDetails.address});
            var user = await this.supplyStatus.registrations.call(userDetails.address);
            assert.equal(user.userAddress, userDetails.address, "The deployer is not the admin");
            expectEvent(register.receipt, "NewRegistration", {
                reg_id: new BN(userDetails.id),
                _address: userDetails.address,
                _username: userDetails.username,
                _userCategory: new BN(userDetails.category.pos),
                _isAuthenticated: false
            })
        }
        });
    //Testing approve user function
    it("Should approve user", async () =>{
        for(var user in this.registrations_){
        var userDetails = this.registrations_[user];
        var approve = await this.supplyStatus.approveUser(userDetails.address, {from: accounts[0]})
        var user = await this.supplyStatus.accounts.call(userDetails.address);
        assert.equal(user.userAddress, userDetails.address, "The user adddress is not correct");
        expectEvent(approve.receipt, "ApproveUser", {
            acc_id: new BN(userDetails.id),
            _address: userDetails.address,
            _username: userDetails.username,
            _userCategory: new BN(userDetails.category.pos),
            _isAuthenticated: true
        })
    }    
    });
    //Adding a local product
    it("Should add local product", async () =>{
        var a_product = await this.supplyStatus.addProduct('phone', 300, {from: this.registrations_.LocalSeller.address});
        //mapping key = 1
        var product = await this.supplyStatus.products.call(1);
        expectEvent(a_product.receipt, "Product", {
            productId: new BN(1),
            productName: 'phone',
            productPrice: new BN(300),
            _address:  this.registrations_.LocalSeller.address
        })  
        assert.equal(1, product.id, "The ids do not match")  
        assert.equal('phone', product.name, "The names do not match")  
    });

    //Adding a foreign product
    it("Should add Foreign product", async () =>{
        var a_product = await this.supplyStatus.addProduct('tablet', 200, {from: this.registrations_.ForeignSeller.address});

        var product = await this.supplyStatus.products.call(2);
        expectEvent(a_product.receipt, "Product", {
            productId: new BN(2),
            productName: 'tablet',
            productPrice: new BN(200),
            _address:  this.registrations_.ForeignSeller.address
        })  
        assert.equal(2, product.id, "The ids do not match")  
        assert.equal('tablet', product.name, "The names do not match")  
    });

    //Placing a foreign order ith order id 1
    it("Should place a foreign order", async () =>{
            var a_neworder = await this.supplyStatus.placeOrder(2, 4, {from: this.registrations_.Customer.address});
            var neworder = await this.supplyStatus.orders.call(1);
            expectEvent(a_neworder.receipt, "Order", {
                orderId: new BN(1),
                productId: new BN(2),
                quantity: new BN(4),
                totalPrice: new BN(800),
                isDelivered: false,
                customer: this.registrations_.Customer.address,
                seller: this.registrations_.ForeignSeller.address,
                isApprovedByCustoms: false
            })    
        });

        //Placing a local order with order id 2
        it("Should place a local order", async () =>{
            var a_neworder = await this.supplyStatus.placeOrder(1, 1, {from: this.registrations_.Customer.address});
            var neworder = await this.supplyStatus.orders.call(2);
            expectEvent(a_neworder.receipt, "Order", {
                orderId: new BN(2),
                productId: new BN(1),
                quantity: new BN(1),
                totalPrice: new BN(300),
                isDelivered: false,
                customer: this.registrations_.Customer.address,
                seller: this.registrations_.LocalSeller.address,
                isApprovedByCustoms: false
            })    
        });

    //----------------------Transfership process for foreign parcel--------------------

    //Foreign Seller transfers ownership to Foreign Carrier
    it("Should transfer foreign parcel to Foreign Carrier", async () =>{
            var a_transfer = await this.supplyStatus.transferOwnership
            (this.registrations_.ForeignCarrier.address, 1, {from: this.registrations_.ForeignSeller.address});
            var transfer = await this.supplyStatus.orders.call(1);
            expectEvent(a_transfer.receipt, "Ownership", {
                _address: this.registrations_.ForeignCarrier.address,
                orderId: new BN(1)
            })    
        });
    
    //Foriegn Carrier transfers parcel ownership to Shipping Company
    it("Should transfer foreign parcel to Shipping Company", async () =>{
        var a_transfer = await this.supplyStatus.transferOwnership
        (this.registrations_.ShippingCompany.address, 1, {from: this.registrations_.ForeignCarrier.address});
        var transfer = await this.supplyStatus.orders.call(1);
        expectEvent(a_transfer.receipt, "Ownership", {
            _address: this.registrations_.ShippingCompany.address,
            orderId: new BN(1)
        })    
    });

    //Customs should approve foreign parcel
    it("Should approve pracel", async () =>{
        var an_approve = await this.supplyStatus.approveParcels(1, {from: this.registrations_.Customs.address})
        var approve = await this.supplyStatus.orders.call(1);
        expectEvent(an_approve.receipt, "ParcelApproval", {
            ordId: new BN(1)
        })
    });

    //Customer queryies parcel ownership 
    it("Should query ownership from customer", async () =>{
        var a_query = await this.supplyStatus.queryOrderOwnership(1, {from: this.registrations_.Customer.address});
        var query = await this.supplyStatus.orders.call(1);
        console.log("The parcel is currently with: ", this.UserCategory_Enum[Object.keys(this.UserCategory_Enum).filter((key)=>{
            return this.UserCategory_Enum[key].pos == a_query;
        }
        )].val);
    });

    //Shipping Company transfers parcel ownership to Local Carrier
    it("Should transfer foreign parcel to Local Carrier", async () =>{
        var a_transfer = await this.supplyStatus.transferOwnership
        (this.registrations_.LocalCarrier.address, 1, {from: this.registrations_.ShippingCompany.address});
        var transfer = await this.supplyStatus.orders.call(1);
        expectEvent(a_transfer.receipt, "Ownership", {
            _address: this.registrations_.LocalCarrier.address,
            orderId: new BN(1)
        })    
    });

    //Local Carrier transfers parcel ownership to Customer
    it("Should transfer foreign parcel to Customer", async () =>{
        var a_transfer = await this.supplyStatus.transferOwnership
        (this.registrations_.Customer.address, 1, {from: this.registrations_.LocalCarrier.address});
        var transfer = await this.supplyStatus.orders.call(1);
        expectEvent(a_transfer.receipt, "Ownership", {
            _address: this.registrations_.Customer.address,
            orderId: new BN(1)
        })    
    });

    //----------------------Transfership process for local parcel--------------------

    //Local Seller transfers ownership to Local Carrier
    it("Should transfer local parcel to Local Carrier", async () =>{
        var a_transfer = await this.supplyStatus.transferOwnership
        (this.registrations_.LocalCarrier.address, 2, {from: this.registrations_.LocalSeller.address});
        var transfer = await this.supplyStatus.orders.call(2);
        expectEvent(a_transfer.receipt, "Ownership", {
            _address: this.registrations_.LocalCarrier.address,
            orderId: new BN(2)
        })    
    });

    //Local Carrier transfers ownership to Customer
    it("Should transfer local parcel to Customer", async () =>{
        var a_transfer = await this.supplyStatus.transferOwnership
        (this.registrations_.Customer.address, 2, {from: this.registrations_.LocalCarrier.address});
        var transfer = await this.supplyStatus.orders.call(2);
        expectEvent(a_transfer.receipt, "Ownership", {
            _address: this.registrations_.Customer.address,
            orderId: new BN(2)
        })    
    });

    //----------------------Sellers checking if delivered--------------------
    //Should query parcel ownership from foreign seller
    it("Should query ownership from customer", async () =>{
        var a_query = await this.supplyStatus.queryOrderOwnership(1, {from: this.registrations_.ForeignSeller.address});
        var query = await this.supplyStatus.orders.call(1);
        console.log("The foreign parcel is currently with: ", this.UserCategory_Enum[Object.keys(this.UserCategory_Enum).filter((key)=>{
            return this.UserCategory_Enum[key].pos == a_query;
        }
        )].val);
    });

    //Should query parcel ownership from local seller
    it("Should query ownership from customer", async () =>{
        var a_query = await this.supplyStatus.queryOrderOwnership(1, {from: this.registrations_.LocalSeller.address});
        var query = await this.supplyStatus.orders.call(1);
        console.log("The local parcel is currently with: ", this.UserCategory_Enum[Object.keys(this.UserCategory_Enum).filter((key)=>{
            return this.UserCategory_Enum[key].pos == a_query;
        }
        )].val);
    });

    //----------------------Checking order validity--------------------

    //Check order validity of foreign parcel
    it("Should check order validity of foreign parcel", async () =>{
        var a_validity = await this.supplyStatus.checkOrderValidity(1, {from: this.registrations_.Customer.address});
        var query = await this.supplyStatus.orders.call(1);
        console.log("Validity for foreign parcel is: ", a_validity);
    });

    //Check order validity of local parcel
    it("Should check order validity of local parcel", async () =>{
        var a_validity = await this.supplyStatus.checkOrderValidity(1, {from: this.registrations_.Customer.address});
        var query = await this.supplyStatus.orders.call(2);
        console.log("Validity for local parcel is: ", a_validity);
    });
});