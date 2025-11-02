const { sendEmail, mailConfig } = require('./emailjs');
const moment = require('moment');
const db = require('../dbconfig'); // Ensure you have your database connection
const cron = require('node-cron');



// Scheduled task to check for expiring warranties of lincense(softwares & Services) every other day at 12 AM
// let lastEmailSentDate = null;


// cron.schedule('0 12 */2 * *', async () => {
//   // cron.schedule('* * * * *', async () => {
//   console.log('Running warranty expiration check for services expiring within 30 days...');

//   const targetDate = moment().format('YYYY-MM-DD'); // Today's date

//     // Check if the email was sent on the last scheduled day
//     if (lastEmailSentDate === targetDate) {
//       console.log('Email already sent today. Skipping email sending...');
//       return;
//     }

//   const endDate = moment().add(30, 'days').format('YYYY-MM-DD'); // 30 days from today

//   // Prepare email structure
//   let message = `<p>Following License(s) Expiring in less than 30 Days: ${process.env.ENVIRONMENT_STATUS}</p><ul>`;
//   let mailOptions = {
//     from: 'apvaims@apvtechnologies.com',
//     to: mailConfig.to,
//     cc: mailConfig.info,
//     subject: "Don’t Miss Out: Your License(s) about to Expire Soon!",
//     html: message
//   };


//   try {

//     const query = `select *, pr.product_name, pr.category_id, cat.category_name, loc.location_id , loc.location_name from items it
//     left join products pr on it.item_name = pr.product_name
//     left join category cat on cat.category_id = pr.category_id
// 	  left join location loc on loc.location_id = it.location_id
//     where cat.category_id in (2,3030, 1004) and warrantyend_date >= $1 AND warrantyend_date <= $2`;

//     const results = await db.query(query, [targetDate, endDate]);

//     if (results.rows && results.rows.length > 0) {
//       results.rows.forEach((service) => {
//         const formattedDate = moment(service.warrantyend_date).format('DD MMM YYYY');
//         message += `<li>${service.item_code}:  <span style="color:red">Expires on: ${formattedDate} </span></li>`;
//       });
//       message += '</ul>'; // Close list in HTML

//       // Update the email body with the final HTML message
//       mailOptions.html = message;
//       console.log('Prepared email content:', mailOptions);

//       // Send the email notification
//       await sendEmail(mailOptions);
//       console.log('Email sent for expiring warranties.');

//         // Update the in-memory variable
//         lastEmailSentDate = targetDate;

//     } else {
//       console.log('No services are expiring within the next 30 days.');
//     }

//     console.log('Warranty expiration check completed.');

//   } catch (error) {
//     console.error('Error fetching or processing data:', error);
//   }
// });


// Scheduled task to check for lifecycle expiry every day at 11 AM
let lastEmailsendforLifecycle = null; // To track last sent dates for lifecycle emails

cron.schedule('0 11 * * *', async () => {
  console.log('⏰ Running lifecycle expiry check...');

  const today = moment.utc().startOf('day');
  const targetDate = today.format('YYYY-MM-DD');

  if (lastEmailsendforLifecycle === targetDate) {
    console.log('📭 Email already sent today, skipping...');
    return;
  }

  try {
    // ✅ Ensure proper destructuring of query result
    const result = await db.query(`
      SELECT 
        it.item_id,
        it.item_name,
        it.item_code ,
        it.created_date,
        it.date_,
        it.purchase_id,
        it.extended_life_cycle,
        pr.life_cycle,
        cat.category_name,
        loc.location_name
      FROM items it
      LEFT JOIN products pr ON it.item_name = pr.product_name
      LEFT JOIN category cat ON cat.category_id = pr.category_id
      LEFT JOIN location loc ON loc.location_id = it.location_id
      WHERE pr.life_cycle IS NOT NULL AND cat.category_id IN (1) ;
    `);

    const items =  result.rows;
    // console.log(result, "Items with lifecycle data");

    if (!items || !items.length) {
      console.log('No items found with lifecycle info.');
      return;
    }

    const todayUTC = moment.utc().startOf('day');
    const expiringSoon = [];

    for (const item of items) {
      const createdDate = item.date_? moment.utc(item.date_).startOf('day'): null;

      if (!createdDate) continue;

        const totalLifecycleMonths = (item.life_cycle || 0) + (item.extended_life_cycle || 0);

        const addLifecycle = createdDate ? createdDate.clone().add(totalLifecycleMonths, 'months').startOf('day'): null;

       const expiryDate = createdDate.clone().add(totalLifecycleMonths, 'months').startOf('day');


        let daysLeft = addLifecycle? addLifecycle.diff(moment.utc().startOf('day'), 'days') + 1: null;
       

      // const daysLeft = expiryDate.diff(todayUTC, 'days');

      // --- Trigger rules ---
      if ([90, 60, 30,0].includes(daysLeft)) {
        expiringSoon.push({ ...item, daysLeft, expiryDate });
      }
       else if (daysLeft <= 15 && daysLeft >= 0 && daysLeft % 2 !== 0) {
        
        console.log(daysLeft, "daysLeft");
        expiringSoon.push({ ...item, daysLeft, expiryDate });
      }
    }

    if (!expiringSoon.length) {
      console.log('✅ No items meeting the mailing criteria today.');
      return;
    }

    let message = `
      <h3>Following item(s) lifecycle are expiring soon:</h3>
      <ul>
    `;

    expiringSoon.forEach(item => {
      message += `
        <li>
          <strong>${item.item_code}</strong> 
          (${item.category_name}) — 
          <span style="color:red;">Expires in ${item.daysLeft} days (${moment(item.expiryDate).format('DD MMM YYYY')})</span>
        </li>
      `;
    });

    message += '</ul><p>Please take necessary actions.</p>';


    let mailOptions = {
    from: 'apvaims@apvtechnologies.com',
    to: mailConfig.to,
    cc: mailConfig.info,
    subject: '⚠️ Lifecycle Expiry Alert - Action Required',
    html: message
  };

    await sendEmail(mailOptions);
    console.log(`📩 Lifecycle expiry alert sent for ${expiringSoon.length} item(s).`);

    lastEmailSentDate = targetDate;

  } catch (err) {
    console.error('❌ Error in lifecycle scheduler:', err);
  }
});


// ✅ Helper for alternate-day sending when 15 days left
function shouldSendAlternateDay(itemId, todayDate) {
  const lastSent = lastEmailSentMap.get(itemId);
  if (!lastSent) return true; // never sent yet
  const diff = moment(todayDate).diff(moment(lastSent), 'days');
  return diff >= 2; // send every 2nd day
}



