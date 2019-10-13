export class Constants {
    public static LEO_FILE_TYPE_EXTENSION: string = "leo";
    public static LEO_URI_SCHEME: string = "leo";
    public static LEO_URI_SCHEME_HEADER: string = "leo:/";
    public static LEO_TRANSACTION_HEADER: string = "leoBridge:";  // string used to prefix transaction, to differenciate from errors
    public static LEO_PYTHON_POSSIBLE_NAMES: string[] = ["python3", "py", "python"];
    public static LEO_TCPIP_DEFAULT_PORT: number = 32125;
}