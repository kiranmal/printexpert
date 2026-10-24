import AdminTable from "../components/AdminTable";


const payments = [

  [
    "PAY-801",
    "ORD-1001",
    "Rahul Sharma",
    "₹8,499",
    "UPI",
    "Success",
  ],

  [
    "PAY-802",
    "ORD-1002",
    "Priya Singh",
    "₹4,299",
    "Card",
    "Success",
  ],

  [
    "PAY-803",
    "ORD-1003",
    "Aman Verma",
    "₹12,990",
    "Net Banking",
    "Success",
  ],

  [
    "PAY-804",
    "ORD-1004",
    "Neha Gupta",
    "₹2,499",
    "UPI",
    "Pending",
  ],

];


export default function AdminPayments() {

  return (
    <div>

      <div className="page-heading">

        <div>

          <h2>
            Payments
          </h2>

          <p>
            Track all payment
            transactions
          </p>

        </div>

      </div>


      <section className="panel">

        <AdminTable
          headers={[
            "Payment ID",
            "Order ID",
            "Customer",
            "Amount",
            "Method",
            "Status",
          ]}
        >

          {payments.map(
            (payment) => (

              <tr key={payment[0]}>

                {payment.map(
                  (value, index) => (

                    <td key={index}>

                      {index === 5 ? (

                        <span
                          className={`status ${
                            value === "Success"
                              ? "delivered"
                              : "pending"
                          }`}
                        >
                          {value}
                        </span>

                      ) : (
                        value
                      )}

                    </td>

                  )
                )}

              </tr>

            )
          )}

        </AdminTable>

      </section>

    </div>
  );
}