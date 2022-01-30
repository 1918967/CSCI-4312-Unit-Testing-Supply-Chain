pragma solidity >=0.4.22 <0.9.0;

library Library {
    struct Registration {
        uint256 id;
        address userAddress;
        string username;
        UserCategory userCategory;
        bool isAuthenticated;
    }

    struct Account {
        uint256 id;
        address userAddress;
        string username;
        UserCategory userCategory;
    }

    struct Product {
        uint256 id;
        string name;
        uint256 price;
        address seller;
    }

    struct Order {
        uint256 id;
        uint256 productId;
        uint256 quantity;
        uint256 totalPrice;
        uint256 expectedDeliveryDate;
        bool isDelivered;
        address currentOwnership;
        address recepient;
        bool isApprovedByCustoms;
    }

    enum UserCategory {
        LocalSeller,
        ForeignSeller,
        LocalCarrier,
        ForeignCarrier,
        ShippingCompany, 
        Customs, 
        Customer
    }
}
