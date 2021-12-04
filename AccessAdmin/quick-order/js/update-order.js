﻿
//api helpers methods
const helpers = {
    baseUrl: 'Order.aspx',
    header: {
        headers: {
            'Accept': 'application/json',
            'Content-type': 'application/json'
        }
    }
}


//get dress from api
function initData() {
    return {
        isPageLoading: false,

        //order list data
        orderNumber: null,
        selectedIndex: null,
        order: [], //[{OrderDetails: '', dress: {}, measurements:[], styles:[], payments:[] }],

        //get order
        async getOrder() {
            this.isPageLoading = true;

            const response = await fetch(`${helpers.baseUrl}/GetOrderDetails?orderId=207452`, helpers.header);
            const result = await response.json();

            const {
                ClothForId,
                CustomerId,
                CustomerName,
                Phone,
                OrderId,
                OrderList,
                OrderSn,
                OrderAmount,
                Discount,
                PaidAmount
            } = result.d;

            this.orderNumber = OrderSn;
            this.order = OrderList.map(item => {
                return {
                    dress: {
                        dressId: item.DressId,
                        dressName: "d"
                    },
                    orderDetails: item.Details,
                    quantity: item.DressQuantity,
                    measurements: item.Measurements,
                    styles: item.Styles,
                    payments: item.Payments
                }
            });

            this.customer = { CustomerId, CustomerName, Phone }
            await this.getDress(CustomerId, ClothForId);

            this.isPageLoading = false;
        },

        //get dress dropdown
        dressNames: { isLoading: true, data: [] },

        async getDress(customerId, clothForId) {
            const url = `${helpers.baseUrl}/DressDlls?customerId=${customerId}&clothForId=${clothForId}`;
            const response = await fetch(url,helpers.header);
            const result = await response.json();

            this.dressNames.isLoading = false;
            this.dressNames.data = result.d;
        },

        //add to cart dress
        async addToListDress(dressId) {
            //check dress was already added
            if (this.order.length) {
                const isAdded = this.order.some(item => item.dress.dressId === dressId);

                if (isAdded) {
                    $.notify("dress already added", { position: "to center" }, "error");
                    return;
                }
            }

            //get dress info from dress list
            const dress = this.dressNames.data.filter(item => item.DressId === dressId)[0];

            const response = await this.getMeasurementsStyles(dress.DressId);

            this.order.push({
                dress: {
                    dressId: dress.DressId,
                    dressName: dress.DressName
                },
                orderDetails: response.OrderDetails,
                quantity: 1,
                measurements: response.MeasurementGroups,
                styles: response.StyleGroups
            })
        },

        //remove Dress from cart
        removeDress(dressId) {
            const confirmDelete = confirm("Are you confirm to remove dress from list?");
            if (confirmDelete) {
                this.order = this.order.filter(item => item.dress.dressId !== dressId);
                this.selectedIndex = null;
            }
        },

        //measurement and style modal
        onOpenMeasurementStyleModal(isMeasurement, index) {
            const measure = isMeasurement ? 'show' : 'hide';
            const style = !isMeasurement ? 'show' : 'hide';

            this.selectedIndex = index;

            $("#addMeasurement").modal(measure);
            $("#addStyle").modal(style);
        },

        //get measurement and styles
        async getMeasurementsStyles(dressId) {
            const { CustomerId } = this.customer;
            this.isPageLoading = true;

            try {
                const url = `${helpers.baseUrl}/GetDressMeasurementsStyles?dressId=${dressId}&customerId=${CustomerId}`
                const response = await fetch(url, helpers.header);
                const result = await response.json();
                this.isPageLoading = false;

                return result.d;

            } catch (error) {
                console.log(error)
                return null;
            }
        },

        //payments modal
        savedDressPayment: [],

        async onOpenPaymentModal(dressId, index) {
            try {
                this.isPageLoading = true;

                const response = await fetch(`${helpers.baseUrl}/DressPriceDlls?dressId=${dressId}`, helpers.header);
                const result = await response.json();
                this.isPageLoading = false;

                this.savedDressPayment = result.d;
                this.selectedIndex = index;
                $("#addPaymentModal").modal("show");

            } catch (error) {
                console.log(error)
                this.isPageLoading = false;
                return null;
            }

        },

        //on change saved payment
        onChangeSavedPayment(evt, index) {
            const selectElement = evt.target;

            const value = selectElement.value;
            const text = selectElement.options[selectElement.selectedIndex].text
            if (!value) return;

            this.dressPayment.For = text;
            this.dressPayment.UnitPrice = +value;
            this.addPayment(index);
        },

        //add dress payment
        dressPayment: { For: '', UnitPrice: '' },

        //add payment
        addPayment(index) {
            const { For, UnitPrice } = this.dressPayment;
            const orderPayment = this.order[index];
            orderPayment.payments = orderPayment.payments || [];

            //check payment added or not
            const isAdded =
                orderPayment.payments.some(item => item.For.toLocaleLowerCase() === For.toLocaleLowerCase());

            if (isAdded) {
                $.notify(`${For} already added`, { position: "to center" });
                return;
            }

            orderPayment.payments.push({ For, UnitPrice, Quantity: orderPayment.quantity });

            //reset form
            this.dressPayment = { For: '', UnitPrice: '' };

            $.notify(`${For} added successfully`, { position: "to center", className: "success" });
        },

        //remove payment
        removePayment(paymentFor, index) {
            const orderPayment = this.order[index]
            orderPayment.payments = orderPayment.payments.filter(item => item.For !== paymentFor);
        },

        //customer
        customer: {},

        //find fabrics
        fabricsPayment: {
            For: '',
            Quantity: '',
            Unit_Price: '',
            FabricID: '',
            StockFabricQuantity: 0,
            FabricsName: ''
        },

        findFabrics(evt) {
            this.fabricsPayment.FabricID = "";

            $(`#${evt.target.id}`).typeahead({
                minLength: 1,
                displayText: item => {
                    return `${item.FabricCode}, ${item.FabricsName}`;
                },
                afterSelect: function(item) {
                    this.$element[0].value = item.FabricCode;
                },
                source: (request, result) => {
                    $.ajax({
                        url: `Order.aspx/FindFabrics?prefix=${JSON.stringify(request)}`,
                        contentType: "application/json; charset=utf-8",
                        success: response => {
                            result(response.d);
                        },
                        error: err => {
                            console.log(err);
                        }
                    });
                },
                updater: item => {
                    this.fabricsPayment.For = item.FabricCode;
                    this.fabricsPayment.FabricID = item.FabricId;
                    this.fabricsPayment.UnitPrice = item.SellingUnitPrice;
                    this.fabricsPayment.StockFabricQuantity = item.StockFabricQuantity;
                    return item;
                }
            })
        },

        //add fabrics
        addFabric(index) {
            const { For, UnitPrice, Quantity, FabricID } = this.fabricsPayment;

            if (!FabricID) return $.notify(`Add fabric`, { position: "to center" });

            const orderPayment = this.order[index];
            orderPayment.payments = orderPayment.payments || [];

            //check payment added or not
            const codeName = `Fabric Code: ${For}`
            const isAdded = orderPayment.payments.some(item => item.For.toLocaleLowerCase() === codeName.toLocaleLowerCase());

            if (isAdded) return $.notify(`${For} already added`, { position: "to center" });

            orderPayment.payments.push({ For: `Fabric Code: ${For}`, UnitPrice, Quantity, FabricID });

            $.notify(`${For} added successfully`, { position: "to center", className: "success" });

            //reset form
            this.fabricsPayment = { For: '', Quantity: '', UnitPrice: '', FabricID: '', StockFabricQuantity: 0 };
        },


        //Get Discount limit %
        discountLimit: 0,
        async getDiscountLimit() {
            const response = await fetch(`${helpers.baseUrl}/GetDiscountLimitPercentage`, helpers.header);
            const result = await response.json();
            this.discountLimit = result.d || 0;
        },


        //get account
        paymentMethod: [],
        async getAccount() {
            const response = await fetch(`${helpers.baseUrl}/AccountDlls`, helpers.header);
            const result = await response.json();
            this.paymentMethod = result.d;
        },

        //*** SUBMIT ORDER **//
        orderPayment : { OrderAmount: 0, Discount: 0, PaidAmount: 0, AccountId: null },

        //calculate order total amount
        orderTotalAmount: 0,
        calculateTotal() {
            const isPayment = this.order.filter(item => item.payments && item.payments).map(item => item.payments).flat(1);
            if (!isPayment.length) return 0;

            const total = isPayment.map(item => item.Quantity * item.UnitPrice).reduce((prev, current) => prev + current)
            this.orderTotalAmount = total;

            return total || 0;
        },

        //submit
        isSubmit: false,
        async submitOrder() {
            if (!this.customer.CustomerId) return $.notify(`Customer Not Added`, { position: "to center" });

            //create new model
            const OrderList = this.order.map(item => {
                return {
                    DressId: item.dress.dressId,
                    DressQuantity: item.quantity,
                    Details: item.orderDetails,
                    ListMeasurement: item.measurements.map(g => g.Measurements),
                    ListStyle: item.styles.map(s => s.Styles),
                    ListPayment: JSON.stringify(item.payments)
                }
            });

            //set flat array
            OrderList.forEach(item => {
                const measureMapped = item.ListMeasurement.flatMap(m => m);
                const styleMapped = item.ListStyle.flatMap(m => m);

                //measure
                item.ListMeasurement = JSON.stringify(measureMapped.reduce((measure, obj) => {
                        if (obj.Measurement)
                            measure.push({ id: obj.MeasurementTypeID, value: obj.Measurement });

                        return measure;
                    },
                    []));

                //style
                item.ListStyle = JSON.stringify(styleMapped.reduce((style, obj) => {
                        if (obj.IsCheck)
                            style.push({ id: obj.DressStyleId, value: obj.DressStyleMesurement });

                        return style;
                    },
                    []));
            });

            //customer info
            const { CustomerID, Cloth_For_ID } = this.customer.data;
            const { Discount, PaidAmount, AccountId } = this.orderPayment;

           
            const defaultAccount = this.paymentMethod.filter(item => item.IsDefault)[0];

            const model = {
                OrderSn: this.orderNumber || '',
                ClothForId: Cloth_For_ID,
                CustomerId: CustomerID,
                OrderAmount: this.calculateTotal(),
                Discount,
                PaidAmount,
                AccountId: AccountId || defaultAccount.AccountId,
                OrderList // [ DressId, DressQuantity, Details, ListMeasurement[], ListStyle[], ListPayment[] ]
            }

            try {
                this.isSubmit = true;
                const response = await fetch(`${helpers.baseUrl}/PostOrder`,{
                    method: "POST",
                    headers: helpers.header.headers,
                    body: JSON.stringify({ model })
                });

                const result = await response.json();
                localStorage.removeItem("order-data")

                location.href = `../Order/OrderDetailsForCustomer.aspx?OrderID=${result.d}`;
            } catch (e) {
                $.notify(e.message, { position: "to center" });
                this.isSubmit = false;
            }
        }
    }
}
