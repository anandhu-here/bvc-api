export const getHomeTemplate = (link: string) => {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Invitation to Join Our Agency</title>
  <style>
    /* Add some basic styling */
    body {
      font-family: Arial, sans-serif;
      background-color: #f2f2f2;
      padding: 20px;
    }
    .container {
      background-color: white;
      padding: 20px;
      border-radius: 5px;
      box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
    }
    .button {
      background-color: #4CAF50;
      border: none;
      color: white;
      padding: 10px 20px;
      text-align: center;
      text-decoration: none;
      display: inline-block;
      font-size: 16px;
      margin: 4px 2px;
      cursor: pointer;
      border-radius: 5px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h2>Invitation to Join Our Agency</h2>
    <p>Dear [Care Home Name],</p>
    <p>We are thrilled to invite your care home to join our agency. As a leading provider of care services in the region, we believe that our partnership would be mutually beneficial and allow us to deliver exceptional care to our clients.</p>
    <p>By joining our agency, you will gain access to a wide range of resources, including:</p>
    <ul>
      <li>Extensive client network and referral opportunities</li>
      <li>Comprehensive training and professional development programs</li>
      <li>Dedicated administrative and operational support</li>
      <li>Competitive compensation and benefits packages</li>
    </ul>
    <p>To accept this invitation and learn more about the benefits of becoming a part of our agency, please click the button below:</p>
    <a href=${link} target="_blank">
      <button class="button">Join Our Agency</button>
    </a>
    <p>We are confident that our partnership will lead to better care outcomes for your clients and a more rewarding experience for your care team.</p>
    <p>If you have any questions or would like to discuss this further, please don't hesitate to reach out to us.</p>
    <p>Best regards,</p>
    <p>[Your Agency Name]</p>
    <p>[Sender Name]</p>
    <p>[Sender Email]</p>
  </div>
</body>
</html>`;
};
