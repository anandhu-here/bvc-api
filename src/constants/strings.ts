/**
 * Define Global Strings
 */

class StringValues {
  public static MISSING_REQUIRED_FIELDS: "Missing required fields";
  public static INVALID_PASSWORD_LENGTH: "Password length should be greater than or equal to 8 characters";

  // Authentication related
  public static AUTH_PARAM_HEADER_NOT_FOUND =
    "Authorization parameter not found in request header";
  public static TOKEN_NOT_FOUND_IN_AUTH_HEADER =
    "Token not found in authorization header";
  public static TOKEN_NOT_VERIFIED = "Token could not be verified";
  public static TOKEN_EXPIRED = "Token has expired";
  public static USER_NOT_FOUND = "User not found";

  // Organization related
  public static ORGANIZATION_ID_REQUIRED = "Organization ID is required";
  public static NO_ACCESS_TO_ORGANIZATION =
    "You do not have access to this organization";
  public static INSUFFICIENT_PERMISSIONS =
    "You do not have sufficient permissions for this action";
  public static INVALID_ORGANIZATION_TYPE = "Invalid organization type";

  // Parent Company related
  public static PARENT_COMPANY_ID_REQUIRED = "Parent Company ID is required";
  public static PARENT_COMPANY_NOT_FOUND = "Parent Company not found";
  public static NO_ACCESS_TO_PARENT_COMPANY =
    "You do not have access to this parent company";

  // Role related
  public static ROLE_NOT_FOUND = "Role not found";

  // User Invitation related
  public static INVALID_EMAIL_FORMAT = "Invalid email format";
  public static INVALID_ROLE = "Invalid role";
  public static INVALID_ORGANIZATION = "Invalid organization";

  // General
  public static INTERNAL_SERVER_ERROR = "An internal server error occurred";
  public static UNAUTHORIZED_ACCESS = "Unauthorized access";
  public static FORBIDDEN_ACCESS = "Forbidden access";
  public static RESOURCE_NOT_FOUND = "Requested resource not found";
  public static INVALID_INPUT = "Invalid input provided";
  public static OPERATION_FAILED = "Operation failed";

  // User Registration
  public static EMAIL_ALREADY_EXISTS = "Email already exists";
  public static USERNAME_ALREADY_EXISTS = "Username already exists";

  // Profile Update
  public static PROFILE_UPDATE_FAILED = "Failed to update profile";

  // Password Reset
  public static PASSWORD_RESET_LINK_SENT =
    "Password reset link has been sent to your email";
  public static INVALID_PASSWORD_RESET_TOKEN =
    "Invalid or expired password reset token";
  public static PASSWORD_RESET_SUCCESS = "Password has been successfully reset";

  // Account Verification
  public static ACCOUNT_VERIFICATION_REQUIRED = "Account verification required";
  public static ACCOUNT_VERIFICATION_SUCCESS =
    "Account has been successfully verified";
  public static INVALID_VERIFICATION_TOKEN =
    "Invalid or expired verification token";

  // Invitation
  public static INVITATION_SENT = "Invitation has been sent successfully";
  public static INVITATION_ACCEPTED =
    "Invitation has been accepted successfully";
  public static INVITATION_REJECTED = "Invitation has been rejected";
  public static INVALID_INVITATION = "Invalid or expired invitation";

  // Database Operations
  public static DATABASE_CONNECTION_ERROR = "Failed to connect to the database";
  public static DATABASE_OPERATION_FAILED = "Database operation failed";

  // API Responses
  public static SUCCESS = "Operation completed successfully";
  public static CREATED = "Resource created successfully";
  public static UPDATED = "Resource updated successfully";
  public static DELETED = "Resource deleted successfully";
  // Password reset
  public static PASSWORD_RESET_EMAIL_SENT: "Password reset link sent";
  public static EMAIL_SEND_ERROR = "Error sending email";
  public static INVALID_REQUEST = "Invalid request";
  public static PASSWORD_RESET_FAILED = "Password reset failed";
  public static INVALID_OR_EXPIRED_TOKEN = "Invalid or expired token";
  public static PASSWORD_RESET_LINK_EXPIRED: "Password reset link expired";
  public static PASSWORD_RESET_LINK_INVALID: "Password reset link invalid";
  public static PASSWORD_RESET_OTP_SENT: "Password reset OTP sent";
  public static PASSWORD_RESET_OTP_VERIFIED: "Password reset OTP verified";

  // Payment

  public static NO_SUBSCRIPTION_FOUND: "No subscription found for the user";
  public static SUBSCRIPTION_ACTIVE: "Subscription is active";
  public static SUBSCRIPTION_CANCELED: "Subscription has been canceled";
  public static SUBSCRIPTION_PAST_DUE: "Subscription payment is past due";
  public static SUBSCRIPTION_UNPAID: "Subscription payment is unpaid";
  public static SUBSCRIPTION_INCOMPLETE: "Subscription setup is incomplete";
  public static INVALID_SUBSCRIPTION_STATUS: "Invalid subscription status";

  public static ACTIVE_SUBSCRIPTION_REQUIRED =
    "Active subscription is required";

  public static NO_ACTIVE_SUBSCRIPTION = "No active subscription found";
  public static SUBSCRIPTION_NOT_FOUND = "Subscription not found";
  public static SUBSCRIPTION_NOT_ACTIVE = "Subscription is not active";
  public static SUBSCRIPTION_NOT_CHECKED = "Subscription status not checked";
  public static PLAN_UPGRADE_REQUIRED =
    "Plan upgrade required to access this feature";
  public static PAYMENT_REQUIRED = "Payment is required to access this feature";
  public static PAYMENT_FAILED = "Payment transaction failed";
  public static PAYMENT_SUCCESSFUL = "Payment processed successfully";
  public static SUBSCRIPTION_CREATED_SUCCESS =
    "Subscription created successfully";
  public static SUBSCRIPTION_UPDATED_SUCCESS =
    "Subscription updated successfully";
  public static SUBSCRIPTION_CANCELLED_SUCCESS =
    "Subscription cancelled successfully";
  public static UNAUTHORIZED_TO_MODIFY_SUBSCRIPTION =
    "Unauthorized to modify this subscription";
  public static PAYMENT_METHOD_REQUIRED = "Payment method is required";
  public static INVALID_PAYMENT_METHOD = "Invalid payment method";
  public static SUBSCRIPTION_ALREADY_EXISTS =
    "Active subscription already exists";
  public static INSUFFICIENT_FUNDS = "Insufficient funds for this transaction";
  public static BILLING_INFORMATION_REQUIRED =
    "Billing information is required";
  public static INVALID_COUPON_CODE = "Invalid coupon code";
  public static COUPON_APPLIED_SUCCESS = "Coupon applied successfully";
  public static SUBSCRIPTION_PLAN_NOT_FOUND = "Subscription plan not found";
  public static PAYMENT_HISTORY_FETCHED_SUCCESS =
    "Payment history fetched successfully";
  public static REFUND_PROCESSED_SUCCESS = "Refund processed successfully";
  public static UNABLE_TO_PROCESS_REFUND =
    "Unable to process refund at this time";

  public static INVITATION_CANCELLED_SUCCESS =
    "Invitation cancelled successfully";
  public static INVITATIONS_FETCHED_SUCCESS =
    "Invitations fetched successfully";
  public static UNAUTHORIZED_TO_CANCEL_INVITATION =
    "Unauthorized to cancel this invitation";
  public static INVITATION_ALREADY_PROCESSED =
    "Invitation is already processed";
  public static INVITATION_SENT_SUCCESS: "Invitation sent successfully";
  public static INVITATION_ACCEPTED_SUCCESS: "Invitation accepted successfully";
  public static INVITATION_REJECTED_SUCCESS: "Invitation rejected successfully";
  public static RECEIVER_ID_REQUIRED: "Receiver ID is required";
  public static INVITATION_ID_REQUIRED: "Invitation ID is required";
  public static SENDER_NOT_FOUND: "Sender not found";
  public static RECEIVER_NOT_FOUND: "Receiver not found";
  public static INVITATION_NOT_FOUND: "Invitation not found";
  public static UNAUTHORIZED_TO_ACCEPT_INVITATION: "Unauthorized to accept this invitation";
  public static UNAUTHORIZED_TO_REJECT_INVITATION: "Unauthorized to reject this invitation";
  public static INVITATION_NO_LONGER_PENDING: "Invitation is no longer pending";
  public static SEARCH_CRITERIA_REQUIRED = "Search criteria is required";
  public static SHIFT_TYPE_REQUIRED = "Shift type is required";
  public static INVALID_REQUEST_BODY = "Invalid request body";
  public static USER_SHIFT_TYPE_NOT_FOUND = "User shift type not found";
  public static SHIFT_NAME_REQUIRED = "Shift name is required";
  public static SHIFT_START_END_TIME_REQUIRED =
    "Shift start and end time is required";
  public static EMAIL_REQUIRED: string = "Email is required";
  public static EMAIL_OR_USERNAME_REQUIRED: string =
    "Either email or username is required";
  public static EMAIL_NOT_REGISTERED: string = "Email is not registered";
  public static EMAIL_ALREADY_REGISTERED: string =
    "Email is already registered";
  public static INCORRECT_USERNAME: string = "Username is incorrect";
  public static USERNAME_REQUIRED: string = "Username is required";
  public static USERNAME_ALREADY_REGISTERED: string =
    "Username is already registered";
  public static OTP_SEND_SUCCESS: string = "OTP sent";
  public static SOMETHING_WENT_WRONG: string = "Something went wrong";
  public static INVALID_TOKEN: string = "Token is invalid";
  public static TOKEN_NOT_FOUND: string = "Token not found";
  public static TOKEN_INVALID_EXPIRED: string = "Token is invalid or expired";
  public static JWT_TOKEN_INVALID: string = "Jwt token is invalid";
  public static BEARER_TOKEN_REQUIRED: string = "Bearer token is required";

  public static AUTH_PARAM_REQUIRED: string =
    "Authorization parameter is required";
  public static AUTH_TOKEN_REQUIRED: string = "Auth token is required";
  public static EMAIL_SEND_SUCCESS: string = "Email sent";
  public static EMAIL_SUBJECT_REQUIRED: string = "Email subject is required";
  public static EMAIL_BODY_REQUIRED: string = "Email body is required";
  public static SENDGRID_API_KEY_NOT_FOUND: string =
    "SendGrid API key not found";
  public static FIRST_NAME_REQUIRED: string = "First name is required";
  public static LAST_NAME_REQUIRED: string = "Last name is required";
  public static FULL_NAME_REQUIRED: string = "Full name is required";
  public static OTP_REQUIRED: string = "OTP is required";
  public static INVALID_OTP: string = "OTP is invalid";
  public static INCORRECT_OTP: string = "OTP is incorrect";
  public static OTP_EXPIRED: string = "OTP is expired";
  public static OTP_ALREADY_USED: string = "OTP is already used";
  public static REGISTER_SUCCESS: string = "User registered";
  public static LOGIN_SUCCESS: string = "User logged in";
  public static INCORRECT_EMAIL_UNAME: string =
    "Email or username is incorrect";
  public static INVALID_USERNAME_FORMAT: string = "Username format is invalid";
  public static PROFILE_DATA_NOT_FOUND: string = "Profile data not found";
  public static JWT_SECRET_NOT_FOUND: string = "JWT secret not found";
  public static JWT_TOKEN_CREATE_ERROR: string =
    "An error occurred while creating token";
  public static DONE: string = "Done";
  public static FAILURE: string = "Failure";
  public static UNAUTHORIZED: string = "Unauthorized";
  public static OTP_CREATE_ERROR = "An error occurred while creating an otp";
  public static TEXT_OR_MEDIA_REQUIRED = "Either text or media is required";
  public static MEDIA_FILES_REQUIRED = "Atleast one media file is required";
  public static MEDIA_FILES_MAX_LIMIT = "Maximum 10 media file are allowed";
  public static TEXT_REQUIRED = "Text is required";
  public static POLL_OPTIONS_REQUIRED = "Poll options are required";
  public static POLL_OPTIONS_MIN_REQUIRED =
    "Atleast 2 poll options are required";
  public static POLL_OPTIONS_MAX_LIMIT = "Maximum 4 poll options are allowed";
  public static POLL_END_DURATION_REQUIRED = "Poll end duration is required";
  public static POST_TYPE_REQUIRED = "Post type is required";
  public static INVALID_POST_TYPE = "Post type is invalid";
  public static INVALID_REQUEST_METHOD = "Request method is invalid";
  public static JOB_VACANCIES_LIMIT_EXCEEDED = "Job vacancies limit exceeded";
  public static JOB_DATA_REQUIRED = "Job data are required";
  public static JOB_TITLE_REQUIRED = "Job title is required";
  public static JOB_MANDATORY_SKILLS_REQUIRED = "Mandatory skills are required";
  public static JOB_MANDATORY_SKILLS_MAX_LIMIT_ERROR =
    "Maximum 5 mandatory skills are allowed";
  public static JOB_OPTIONAL_SKILLS_MAX_LIMIT_ERROR =
    "Maximum 10 optional skills are allowed";
  public static JOB_SALARY_RANGE_REQUIRED = "Salary range is required";
  public static JOB_MIN_SALARY_REQUIRED = "Minimum salary is required";
  public static JOB_MAX_SALARY_REQUIRED = "Maximum salary is required";
  public static JOB_PROBATION_DURATION_REQUIRED =
    "Probation duration is required";
  public static JOB_PROBATION_SALARY_RANGE_REQUIRED =
    "Probation salary range is required";
  public static JOB_MIN_PROBATION_SALARY_REQUIRED =
    "Probation minimum salary is required";
  public static JOB_MAX_PROBATION_SALARY_REQUIRED =
    "Probation maximum salary is required";
  public static JOB_OPENINGS_REQUIRED = "Job openings is required";
  public static JOB_TYPE_REQUIRED = "Job type is required";
  public static JOB_LOCATION_REQUIRED = "Job location is required";

  public static CURRENCY_CODE_REQUIRED = "Currency code is required";
  public static CURRENCY_SYMBOL_REQUIRED = "Currency symbol is required";
  public static JOB_DESCRIPTION_REQUIRED = "Job description is required";
  public static MIN_QUALIFICATION_REQUIRED =
    "Minimum qualification is required";
  public static JOB_CATEGORY_REQUIRED = "Job category is required";
  public static JOB_INDUSTRY_REQUIRED = "Job industry is required";
  public static JOB_LOCATION_CITY_REQUIRED = "Job location city is required";
  public static JOB_LOCATION_STATE_REQUIRED = "Job location state is required";
  public static JOB_LOCATION_COUNTRY_REQUIRED =
    "Job location country is required";
  public static JOB_PREFERRED_JOINING_DATE_REQUIRED =
    "Job preferred joining date is required";
  public static JOB_WORK_EXPERIENCE_REQUIRED = "Work experience is required";
  public static JOB_MIN_WORK_EXPERIENCE_REQUIRED =
    "Minimum work experience is required";
  public static JOB_MAX_WORK_EXPERIENCE_REQUIRED =
    "Maximum work experience is required";
  public static ACTION_NOT_PERMITTED =
    "This account is not permitted to perform this action";
  public static PROFILE_NOT_FOUND = "Profile not found";
  public static USER_TYPE_REQUIRED = "User type is required";
  public static PHONE_REQUIRED = "Phone number is required";
  public static INVALID_PHONE_FORMAT = "Phone number format is invalid";
  public static COMPANY_NAME_REQUIRED = "Company name is required";
  public static DESIGNATION_REQUIRED = "Designation is required";
  public static OLD_PASSWORD_REQUIRED = "Old password is required";
  public static PASSWORD_REQUIRED = "Password is required";
  public static CONFIRM_PASSWORD_REQUIRED = "Confirm password is required";
  public static PASSWORDS_DO_NOT_MATCH = "Passwords do not match";
  public static PHONE_ALREADY_USED = "Phone number is already used";
  public static OLD_PASSWORD_MIN_LENGTH_ERROR =
    "Old password length should be greater than or equal to 8 characters";
  public static OLD_PASSWORD_MAX_LENGTH_ERROR =
    "Old password length should not be greater than 32 characters";
  public static PASSWORD_MIN_LENGTH_ERROR =
    "Password length should be greater than or equal to 8 characters";
  public static PASSWORD_MAX_LENGTH_ERROR =
    "Password length should not be greater than 32 characters";
  public static CONFIRM_PASSWORD_MIN_LENGTH_ERROR =
    "Confirm password length should be greater than or equal to 8 characters";
  public static CONFIRM_PASSWORD_MAX_LENGTH_ERROR =
    "Confirm password length should not be greater than 32 characters";
  public static PHONE_LENGTH_ERROR =
    "Phone number length should be equal to 10 characters";
  public static INCORRECT_PASSWORD = "Password is incorrect";
  public static INCORRECT_OLD_PASSWORD = "Old password is incorrect";
  public static POST_NOT_FOUND = "Post not found";
}

export default StringValues;
