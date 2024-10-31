import { User } from "src/models/new/Heirarchy";

class UserServices {
  public async getLinkedAccounts(userId: string): Promise<any> {
    try {
      const user = await User.findById(userId).populate("linkedAccounts");
    } catch (error: any) {
      throw new Error(error);
    }
  }
}
